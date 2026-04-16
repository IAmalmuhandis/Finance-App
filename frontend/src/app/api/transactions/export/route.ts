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
    const query: any = { userId };
    if (accountIds.length) query.accountId = { $in: accountIds };
    if (categories.length) query.category = { $in: categories };
    if (type === "credits") query.type = "CREDIT";
    if (type === "debits") query.type = "DEBIT";
    if (search) query.description = { $regex: search, $options: "i" };
    const txns = await Transaction.find(query).sort({ date: -1 }).populate("accountId").lean();
    const csv = [
      "Date,Description,Account,Category,Type,Amount",
      ...txns.map((t: any) =>
        [
          new Date(t.date).toISOString().slice(0, 10),
          `"${String(t.description).replace(/"/g, '""')}"`,
          `"${(t.accountId as any)?.nickname || ""}"`,
          `"${t.category || "Other"}"`,
          t.type,
          t.amount,
        ].join(",")
      ),
    ].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Export failed" }, { status: 500 });
  }
}

