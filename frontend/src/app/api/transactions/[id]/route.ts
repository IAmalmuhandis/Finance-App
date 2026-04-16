import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Transaction } from "@/lib/models/Transaction";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await connectMongo();
    const userId = await getRequestUserId();
    const { category } = await req.json();
    const updated = await Transaction.findOneAndUpdate(
      { _id: id, userId },
      { $set: { category: String(category || "Other") } },
      { new: true }
    ).lean();
    if (!updated) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    return NextResponse.json({ transaction: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Update failed" }, { status: 400 });
  }
}

