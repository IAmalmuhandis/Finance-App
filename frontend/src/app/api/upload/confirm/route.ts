import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Transaction } from "@/lib/models/Transaction";
import { categorize } from "@/lib/categorize";
import { format, isValid } from "date-fns";
import { StatementImport } from "@/lib/models/StatementImport";

export const maxDuration = 300;

function monthKeyFromDate(d: Date) {
  return format(d, "yyyy-MM");
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const { transactions, accountId, month, sourceFileName, statementDocument } = await req.json();
    if (!Array.isArray(transactions) || !accountId) {
      return NextResponse.json({ error: "transactions and accountId required" }, { status: 400 });
    }
    const formMonth = String(month || "").trim();
    const docs = transactions
      .map((t: any) => {
        const date = new Date(t.date);
        if (!isValid(date) || Number.isNaN(date.valueOf())) return null;
        const description = String(t.description || "").trim();
        const amount = Math.abs(Number(t.amount || 0));
        if (!description || !Number.isFinite(amount)) return null;
        return {
          userId,
          accountId,
          date,
          description,
          amount,
          type: t.type === "CREDIT" ? "CREDIT" : "DEBIT",
          category: t.category || categorize(description),
          month: monthKeyFromDate(date),
        };
      })
      .filter((d) => d != null);

    if (docs.length === 0) return NextResponse.json({ error: "No valid transactions to save" }, { status: 400 });
    const inserted = await Transaction.insertMany(docs);

    const totalCredit = docs.filter((d: any) => d.type === "CREDIT").reduce((s: number, d: any) => s + d.amount, 0);
    const totalDebit = docs.filter((d: any) => d.type === "DEBIT").reduce((s: number, d: any) => s + d.amount, 0);
    const earliest = docs.reduce(
      (earliestD: Date, d: (typeof docs)[0]) => (d.date < earliestD ? d.date : earliestD),
      docs[0]!.date
    );
    const importMonth = formMonth || monthKeyFromDate(earliest);

    await StatementImport.create({
      userId,
      accountId,
      month: importMonth,
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
          month: importMonth,
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

