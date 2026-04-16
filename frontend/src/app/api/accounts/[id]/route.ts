import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Account } from "@/lib/models/Account";
import { Transaction } from "@/lib/models/Transaction";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await connectMongo();
    const userId = await getRequestUserId();
    const account = await Account.findOneAndDelete({ _id: id, userId });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    await Transaction.deleteMany({ accountId: id, userId });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 400 });
  }
}

