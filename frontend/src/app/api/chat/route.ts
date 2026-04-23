import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isUsableAnthropicApiKey } from "@/lib/anthropic-key";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Conversation } from "@/lib/models/Conversation";
import { Transaction } from "@/lib/models/Transaction";
import { Account } from "@/lib/models/Account";

export async function POST(req: Request) {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const { message, conversationId, history = [] } = await req.json();
    if (!message || typeof message !== "string") return NextResponse.json({ error: "message required" }, { status: 400 });

    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    const [txns, accounts] = await Promise.all([
      Transaction.find({ userId, date: { $gte: start } }).sort({ date: -1 }).lean(),
      Account.find({ userId }).lean(),
    ]);
    const totalIncome = txns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txns.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
    const net = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : "0";
    const topCategories = Object.entries(
      txns.filter((t) => t.type === "DEBIT").reduce((acc: Record<string, number>, t) => {
        acc[t.category || "Other"] = (acc[t.category || "Other"] || 0) + t.amount;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${v.toFixed(2)}`);
    const recentLargeExpenses = txns
      .filter((t) => t.type === "DEBIT")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((t) => `${new Date(t.date).toISOString().slice(0, 10)} - ${t.description} (${t.amount})`)
      .join(", ");

    const conversation =
      (conversationId ? await Conversation.findOne({ _id: conversationId, userId }) : null) ||
      (await Conversation.create({ userId, title: message.slice(0, 40), messages: [] }));

    if (!isUsableAnthropicApiKey(process.env.ANTHROPIC_API_KEY)) {
      return NextResponse.json(
        {
          error:
            "Add a valid Anthropic API key to the server .env (ANTHROPIC_API_KEY=sk-ant-...) and restart. Placeholders like replace-me are ignored.",
        },
        { status: 503 }
      );
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are a personal finance assistant. You have access to real financial data for this user. Be specific, reference actual numbers, be concise and actionable. Format with markdown when helpful (bullet points, bold for emphasis). Address the user directly.

User's Financial Summary:
- Period: last 3 months
- Total Income: ${totalIncome}
- Total Expenses: ${totalExpenses}
- Net Position: ${net}
- Savings Rate: ${savingsRate}%
- Top spending categories: ${topCategories.join(", ")}
- Recent large expenses: ${recentLargeExpenses}
- Accounts: ${accounts.map((a) => `${a.bankName} (${a.nickname})`).join(", ")}`,
      messages: [...history, { role: "user", content: message }],
    });
    const assistantText = response.content.map((c: any) => ("text" in c ? c.text : "")).join("");
    conversation.messages.push(
      { role: "user", content: message, createdAt: new Date() } as any,
      { role: "assistant", content: assistantText, createdAt: new Date() } as any
    );
    conversation.updatedAt = new Date();
    await conversation.save();
    return NextResponse.json({ response: assistantText, conversationId: String(conversation._id) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 400 });
  }
}

export async function GET() {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const conversations = await Conversation.find({ userId }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({
      conversations: conversations.map((c: any) => ({
        _id: c._id,
        title: c.title,
        createdAt: c.createdAt,
        preview: c.messages?.[0]?.content || "",
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 400 });
  }
}
