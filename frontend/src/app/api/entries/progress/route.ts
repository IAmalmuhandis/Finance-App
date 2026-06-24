import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Entry } from "@/lib/models/Entry";
import { requireAuthUserId } from "@/lib/api-auth";

export async function GET(req: Request) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  await connectMongo();

  const [totalsAgg, byTypeAgg, byBucketAgg, entriesAsc] = await Promise.all([
    Entry.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$grossAmount" },
          entryCount: { $sum: 1 },
          firstAt: { $min: "$createdAt" },
          lastAt: { $max: "$createdAt" },
        },
      },
    ]),
    Entry.aggregate([
      { $match: { userId } },
      { $unwind: "$allocations" },
      { $group: { _id: "$allocations.type", total: { $sum: "$allocations.amount" } } },
    ]),
    Entry.aggregate([
      { $match: { userId } },
      { $unwind: "$allocations" },
      { $group: { _id: "$allocations.name", total: { $sum: "$allocations.amount" } } },
      { $sort: { total: -1 } },
    ]),
    Entry.find({ userId }).sort({ createdAt: 1 }).select("createdAt allocations").lean(),
  ]);

  const totals = totalsAgg[0] ?? null;
  const typeMap = Object.fromEntries(byTypeAgg.map((r: { _id: string; total: number }) => [r._id, r.total]));

  let cumulative = 0;
  const wealthSeries = entriesAsc.map((e) => {
    const keep = (e.allocations as { type: string; amount: number }[])
      .filter((a) => a.type === "Keep")
      .reduce((s, a) => s + a.amount, 0);
    cumulative += keep;
    return { date: e.createdAt, wealthRetained: cumulative };
  });

  return NextResponse.json({
    totalIncome: totals?.totalIncome ?? 0,
    wealthRetained: typeMap.Keep ?? 0,
    totalGiven: typeMap.Give ?? 0,
    totalSpend: typeMap.Spend ?? 0,
    entryCount: totals?.entryCount ?? 0,
    firstAt: totals?.firstAt ?? null,
    lastAt: totals?.lastAt ?? null,
    byBucket: byBucketAgg.map((b: { _id: string; total: number }) => ({ name: b._id, total: b.total })),
    wealthSeries,
  });
}
