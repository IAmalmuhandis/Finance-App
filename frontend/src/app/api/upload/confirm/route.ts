import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Transaction } from "@/lib/models/Transaction";
import { categorize } from "@/lib/categorize";
import { format } from "date-fns";
import { StatementImport } from "@/lib/models/StatementImport";

export async function POST(req: Request) {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const { transactions, accountId, month, sourceFileName, statementDocument } = await req.json();
    if (!Array.isArray(transactions) || !accountId) {
      return NextResponse.json({ error: "transactions and accountId required" }, { status: 400 });
    }
    const docs = transactions
      .map((t: any) => {
      const date = new Date(t.date);
      return {
        userId,
        accountId,
        date,
        description: String(t.description || "").trim(),
        amount: Math.abs(Number(t.amount || 0)),
        type: t.type === "CREDIT" ? "CREDIT" : "DEBIT",
        category: t.category || categorize(String(t.description || "")),
        month: month || format(date, "yyyy-MM"),
      };
      })
      .filter((d: any) => Boolean(d.description) && !Number.isNaN(d.date.valueOf()) && Number.isFinite(d.amount));

    if (docs.length === 0) return NextResponse.json({ error: "No valid transactions to save" }, { status: 400 });
    const inserted = await Transaction.insertMany(docs);

    const totalCredit = docs.filter((d: any) => d.type === "CREDIT").reduce((s: number, d: any) => s + d.amount, 0);
    const totalDebit = docs.filter((d: any) => d.type === "DEBIT").reduce((s: number, d: any) => s + d.amount, 0);
    await StatementImport.create({
      userId,
      accountId,
      month: month || docs[0].month,
      sourceFileName: String(sourceFileName || ""),
      transactionsCount: inserted.length,
      totalCredit,
      totalDebit,
      statementDocument: statementDocument && typeof statementDocument === "object" ? statementDocument : {
        source: {
          fileName: String(sourceFileName || ""),
          parserUsed: "unknown",
        },
        statement: {
          month: month || docs[0].month,
        },
        totals: {
          transactionCount: inserted.length,
          totalCredit,
          totalDebit,
        },
        transactions: transactions || [],
      },
    });

    return NextResponse.json({ saved: inserted.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Confirm failed" }, { status: 400 });
  }
}

