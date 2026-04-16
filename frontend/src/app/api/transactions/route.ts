import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Transaction } from "@/lib/models/Transaction";

export async function GET(req: Request) {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const url = new URL(req.url);
    const accountIds = (url.searchParams.get("accountIds") || "").split(",").filter(Boolean);
    const categories = (url.searchParams.get("categories") || "").split(",").filter(Boolean);
    const type = url.searchParams.get("type") || "all";
    const search = url.searchParams.get("search") || "";
    const page = Number(url.searchParams.get("page") || "1");
    const limit = Number(url.searchParams.get("limit") || "50");
    const sortBy = url.searchParams.get("sortBy") || "date";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const query: any = { userId };
    if (accountIds.length) query.accountId = { $in: accountIds };
    if (categories.length) query.category = { $in: categories };
    if (type === "credits") query.type = "CREDIT";
    if (type === "debits") query.type = "DEBIT";
    if (search) query.description = { $regex: search, $options: "i" };
    if (startDate || endDate) query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);

    const [total, transactions, summaryAgg] = await Promise.all([
      Transaction.countDocuments(query),
      Transaction.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("accountId")
        .lean(),
      Transaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalCredit: { $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] } },
            totalDebit: { $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] } },
          },
        },
      ]),
    ]);
    const summary = summaryAgg[0] || { totalCredit: 0, totalDebit: 0 };
    return NextResponse.json({
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: { ...summary, net: summary.totalCredit - summary.totalDebit },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch transactions" }, { status: 500 });
  }
}

