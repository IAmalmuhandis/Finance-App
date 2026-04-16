import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Transaction } from "@/lib/models/Transaction";
import { Report } from "@/lib/models/Report";

export async function POST(req: Request) {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const { accountIds, month } = await req.json();
    const query: any = { userId };
    if (Array.isArray(accountIds) && accountIds.length) query.accountId = { $in: accountIds };
    if (month) query.month = month;
    const txns = await Transaction.find(query).sort({ date: -1 }).lean();
    const totalIncome = txns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txns.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
    const netPosition = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netPosition / totalIncome) * 100 : 0;
    const categoryMap = txns
      .filter((t) => t.type === "DEBIT")
      .reduce((acc: Record<string, { category: string; amount: number; count: number }>, t) => {
        const key = t.category || "Other";
        acc[key] = acc[key] || { category: key, amount: 0, count: 0 };
        acc[key].amount += t.amount;
        acc[key].count += 1;
        return acc;
      }, {});
    const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);
    const topCategory = categoryBreakdown[0]?.category || "Other";
    const top10Expenses = txns.filter((t) => t.type === "DEBIT").sort((a, b) => b.amount - a.amount).slice(0, 10);
    const monthlyTrendMap = txns.reduce((acc: Record<string, { month: string; income: number; expenses: number }>, t) => {
      acc[t.month] = acc[t.month] || { month: t.month, income: 0, expenses: 0 };
      if (t.type === "CREDIT") acc[t.month].income += t.amount;
      else acc[t.month].expenses += t.amount;
      return acc;
    }, {});
    const monthlyTrends = Object.values(monthlyTrendMap).sort((a, b) => a.month.localeCompare(b.month));
    const financialSummary = {
      totalIncome,
      totalExpenses,
      netPosition,
      savingsRate,
      transactionCount: txns.length,
      topCategory,
      categoryBreakdown,
      monthlyTrends,
      top10Expenses,
    };

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
    const ai = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system:
        "You are an expert personal finance auditor. Analyze the following financial data and return a JSON audit report. Return ONLY valid JSON, no markdown, no explanation outside the JSON.\n\nJSON structure required:\n{\n  \"overview\": \"2-3 sentence high-level summary\",\n  \"spendingPatterns\": \"detailed paragraph about spending behavior\",\n  \"riskAssessment\": \"paragraph on financial risks observed\",\n  \"disciplineScore\": 7.5,\n  \"disciplineExplanation\": \"explanation of the score out of 10\",\n  \"recommendations\": [\"actionable rec 1\", \"rec 2\", \"rec 3\", \"rec 4\", \"rec 5\"],\n  \"insights\": [\n    { \"type\": \"warning\", \"title\": \"High food spending\", \"description\": \"detail\" },\n    { \"type\": \"success\", \"title\": \"Positive savings rate\", \"description\": \"detail\" },\n    { \"type\": \"info\", \"title\": \"Observation\", \"description\": \"detail\" }\n  ]\n}",
      messages: [{ role: "user", content: JSON.stringify(financialSummary) }],
    });
    const raw = ai.content.map((c: any) => ("text" in c ? c.text : "")).join("");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(start, end + 1));
    const content = { ...parsed, ...financialSummary };
    const report = await Report.create({
      userId,
      accountIds: (accountIds || []).map(String),
      month: month || null,
      title: `AI Audit Report${month ? ` - ${month}` : ""}`,
      content,
    });
    return NextResponse.json({ report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Report generation failed" }, { status: 500 });
  }
}

