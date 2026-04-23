import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Transaction } from "@/lib/models/Transaction";
import { Report } from "@/lib/models/Report";
import { Account } from "@/lib/models/Account";

function getRange(kind: string) {
  const now = new Date();
  switch (kind) {
    case "lastMonth": {
      const d = subMonths(now, 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }
    case "last3months":
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    case "last6months":
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case "thisYear":
      return { start: startOfYear(now), end: now };
    case "allTime":
      return { start: new Date("2000-01-01"), end: now };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export async function GET(req: Request) {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const url = new URL(req.url);
    const dateRange = url.searchParams.get("dateRange") || "thisMonth";
    const { start, end } = getRange(dateRange);
    const previousStart = subMonths(start, Math.max(1, Math.round((end.getTime() - start.getTime()) / (30 * 86400000))));
    const previousEnd = subMonths(end, Math.max(1, Math.round((end.getTime() - start.getTime()) / (30 * 86400000))));

    const [txns, prevTxns, categoryChart, monthlyChart, recentTransactions, latestReport] = await Promise.all([
      Transaction.find({ userId, date: { $gte: start, $lte: end } }).lean(),
      Transaction.find({ userId, date: { $gte: previousStart, $lte: previousEnd } }).lean(),
      Transaction.aggregate([
        { $match: { userId, date: { $gte: start, $lte: end }, type: "DEBIT" } },
        { $group: { _id: "$category", amount: { $sum: "$amount" } } },
        { $sort: { amount: -1 } },
      ]),
      Transaction.aggregate([
        { $match: { userId, date: { $gte: startOfMonth(subMonths(new Date(), 5)), $lte: endOfMonth(new Date()) } } },
        { $group: { _id: { month: "$month", type: "$type" }, total: { $sum: "$amount" } } },
        { $sort: { "_id.month": 1 } },
      ]),
      Transaction.find({ userId, date: { $gte: start, $lte: end } }).sort({ date: -1 }).limit(10).lean(),
      Report.findOne({ userId }).sort({ createdAt: -1 }).lean(),
    ]);

    const accountIds = [
      ...new Set(
        (recentTransactions as { accountId?: unknown }[])
          .map((t) => (t.accountId != null ? String(t.accountId) : ""))
          .filter((id) => id && id !== "undefined" && mongoose.Types.ObjectId.isValid(id))
      ),
    ];
    const accounts =
      accountIds.length > 0 ? await Account.find({ _id: { $in: accountIds } }).lean() : [];
    const accountMap = new Map(accounts.map((a: { _id: unknown }) => [String(a._id), a]));

    const statify = (arr: any[]) => {
      const totalIncome = arr.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
      const totalExpenses = arr.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
      const netPosition = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (netPosition / totalIncome) * 100 : 0;
      return { totalIncome, totalExpenses, netPosition, savingsRate };
    };
    const stats = statify(txns as any[]);
    const prevStats = statify(prevTxns as any[]);

    const monthMap = new Map<string, { month: string; income: number; expenses: number }>();
    for (const row of monthlyChart as { _id?: { month?: string; type?: string }; total?: number }[]) {
      const id = row._id;
      if (!id || typeof id !== "object" || !id.month) {
        continue;
      }
      const m = id.month;
      const cur = monthMap.get(m) || { month: m, income: 0, expenses: 0 };
      if (id.type === "CREDIT") {
        cur.income = row.total ?? 0;
      } else {
        cur.expenses = row.total ?? 0;
      }
      monthMap.set(m, cur);
    }

    const pickAccount = (a: { bankName?: string; nickname?: string; color?: string } | null | undefined) => {
      if (!a) return null;
      return {
        bankName: a.bankName ?? "",
        nickname: a.nickname ?? "",
        color: a.color ?? "#3B82F6",
      };
    };
    const safeRecent = (recentTransactions as Record<string, unknown>[]).map((t) => {
      const id = t._id != null ? String(t._id) : "";
      const d = t.date;
      const dateOut = d instanceof Date ? d.toISOString() : typeof d === "string" ? d : null;
      const accId = t.accountId != null ? String(t.accountId) : "";
      const acc =
        accId && mongoose.Types.ObjectId.isValid(accId)
          ? pickAccount(accountMap.get(accId) as { bankName?: string; nickname?: string; color?: string } | undefined)
          : null;
      return {
        _id: id,
        amount: Number(t.amount) || 0,
        date: dateOut,
        description: String(t.description ?? ""),
        type: String(t.type ?? ""),
        category: t.category != null ? String(t.category) : undefined,
        month: t.month != null ? String(t.month) : undefined,
        accountId: accId,
        account: acc,
      };
    });

    const insightsRaw = (latestReport as { content?: { insights?: unknown } } | null)?.content?.insights;
    const insights = Array.isArray(insightsRaw) ? insightsRaw : [];

    return NextResponse.json({
      stats,
      prevStats,
      monthlyChart: [...monthMap.values()],
      categoryChart: categoryChart.map((c) => ({ category: c._id || "Other", amount: c.amount })),
      recentTransactions: safeRecent,
      insights,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) || "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
