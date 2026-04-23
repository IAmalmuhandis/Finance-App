import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isUsableAnthropicApiKey } from "@/lib/anthropic-key";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Transaction } from "@/lib/models/Transaction";
import { Report } from "@/lib/models/Report";
import { computeFinancialAudit } from "@/lib/financial-audit";

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

    const txnsForAudit = (txns as { amount: number; type: string; category?: string; date: string; month: string; description: string }[]);
    const financialAudit = computeFinancialAudit(txnsForAudit, {
      totalIncome: financialSummary.totalIncome,
      totalExpenses: financialSummary.totalExpenses,
      netPosition: financialSummary.netPosition,
      savingsRate: financialSummary.savingsRate,
      topCategory: financialSummary.topCategory,
      categoryBreakdown: financialSummary.categoryBreakdown,
      monthlyTrends: financialSummary.monthlyTrends,
    });

    const pack = { financialSummary, financialAudit, note: "The financialAudit block is pre-computed. Align your analysis with it and expand with narrative." };
    const systemPrompt = `You are a certified-style personal finance analyst. The client received account activity after they uploaded and confirmed bank/CSV statements. Use the pre-computed "financialAudit" and "financialSummary" to produce a defensible report.

Return ONLY valid JSON, no markdown fences, no text outside the JSON.

Required JSON structure:
{
  "executiveSummary": "2-3 sentences: overall financial health and the main takeaways",
  "financialStatus": { "narrative": "paragraph: income vs expenses, runway feel, and stability", "strengths": ["..."], "weaknesses": ["..."] },
  "auditFindings": [
    { "severity": "low|medium|high", "area": "e.g. spending concentration", "finding": "clear statement", "evidence": "refer to numbers/categories" }
  ],
  "detailedReconciliation": "Connect uploaded transaction patterns to: savings margin, top categories, and any red flags. Mention if outflows look concentrated or lumpy.",
  "overview": "2-3 sentence high-level (may overlap with executive summary)",
  "spendingPatterns": "paragraph on category and timing behavior",
  "riskAssessment": "paragraph: liquidity, overspending, and volatility",
  "disciplineScore": 7.5,
  "disciplineExplanation": "why that score 0-10, tied to the audit",
  "recommendations": ["5 actionable items"],
  "insights": [ { "type": "warning|success|info", "title": "string", "description": "string" } ]
}

Align disciplineScore and insights with financialAudit.healthScore and financialAudit.flags where appropriate.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
    let parsed: Record<string, unknown> = {};
    try {
      if (!isUsableAnthropicApiKey(process.env.ANTHROPIC_API_KEY)) {
        throw new Error("ANTHROPIC_API_KEY is not set");
      }
      const ai = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2200,
        system: systemPrompt,
        messages: [{ role: "user", content: JSON.stringify(pack) }],
      });
      const raw = ai.content.map((c: any) => ("text" in c ? c.text : "")).join("");
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start < 0 || end <= start) {
        throw new Error("Model did not return JSON");
      }
      parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      parsed = {
        executiveSummary: "Automated report (AI step skipped or unavailable). The metrics below are from your uploaded transactions.",
        financialStatus: {
          narrative: financialAudit.summaryBullets.join(" "),
          strengths: netPosition >= 0 ? ["Inflows met or exceeded outflows in the selected data."] : [],
          weaknesses: netPosition < 0 ? ["Net flow is negative for this period."] : [],
        },
        auditFindings: financialAudit.flags.map((f) => ({
          severity: f.level === "critical" ? "high" : f.level === "warning" ? "medium" : "low",
          area: f.code,
          finding: f.message,
          evidence: "Rule-based check on your transactions.",
        })),
        detailedReconciliation: "Review category mix and month-by-month changes in the dashboard. Generate again after setting ANTHROPIC_API_KEY for a full AI narrative.",
        overview: financialAudit.summaryBullets[0] || "Not enough data.",
        spendingPatterns: `Top category: ${topCategory}. See categoryBreakdown in metrics.`,
        riskAssessment: "See financialAudit.flags for structured risks.",
        disciplineScore: financialAudit.healthScore / 10,
        disciplineExplanation: "Scaled from the automated health score 0-100 below.",
        recommendations: [
          "Reconcile the largest debit categories and trim discretionary spend if needed.",
          "Aim to keep a positive monthly net and build an emergency buffer.",
        ],
        insights: financialAudit.flags.map((f) => ({
          type: f.level === "critical" ? "warning" : f.level,
          title: f.code,
          description: f.message,
        })),
      };
    }

    const content = { ...parsed, ...financialSummary, financialAudit } as Record<string, unknown>;
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

