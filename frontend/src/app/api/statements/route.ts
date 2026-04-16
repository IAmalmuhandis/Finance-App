import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { StatementImport } from "@/lib/models/StatementImport";

export async function GET(req: Request) {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    const month = url.searchParams.get("month");
    const query: any = { userId };
    if (accountId) query.accountId = accountId;
    if (month) query.month = month;
    const statements = await StatementImport.find(query).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({
      statements: statements.map((s: any) => ({
        id: String(s._id),
        accountId: String(s.accountId),
        month: s.month,
        sourceFileName: s.sourceFileName || "",
        transactionsCount: s.transactionsCount,
        totalCredit: s.totalCredit,
        totalDebit: s.totalDebit,
        statementDocument: s.statementDocument || {},
        createdAt: s.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch statement history" }, { status: 400 });
  }
}
