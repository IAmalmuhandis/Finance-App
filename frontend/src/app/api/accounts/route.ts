import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import { Account } from "@/lib/models/Account";
import { Transaction } from "@/lib/models/Transaction";
import { getRequestUserId } from "@/lib/request-user";

const Body = z.object({
  bankName: z.string().min(1),
  nickname: z.string().min(1),
  type: z.enum(["PERSONAL", "BUSINESS"]).default("PERSONAL"),
  last4: z.string().max(4).optional(),
  currency: z.string().default("NGN"),
  color: z.string().optional(),
});

export async function GET() {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const accounts = await Account.find({ userId }).sort({ createdAt: -1 }).lean();
    const enriched = await Promise.all(
      accounts.map(async (a: any) => {
        const stats = await Transaction.aggregate([
          { $match: { userId, accountId: a._id } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalIn: { $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] } },
              totalOut: { $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] } },
              lastDate: { $max: "$date" },
            },
          },
        ]);
        return {
          ...a,
          id: String(a._id),
          transactionCount: stats[0]?.count ?? 0,
          totalIn: stats[0]?.totalIn ?? 0,
          totalOut: stats[0]?.totalOut ?? 0,
          lastUploadAt: stats[0]?.lastDate ?? null,
        };
      })
    );
    return NextResponse.json({ accounts: enriched });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const body = Body.parse(await req.json());
    const account = await Account.create({
      userId,
      bankName: body.bankName,
      nickname: body.nickname,
      type: body.type,
      last4: body.last4,
      currency: body.currency,
      color: body.color || "#3B82F6",
    });
    return NextResponse.json({ account });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Bad request" }, { status: 400 });
  }
}
