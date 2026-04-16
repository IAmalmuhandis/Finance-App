import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Conversation } from "@/lib/models/Conversation";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await connectMongo();
    const userId = await getRequestUserId();
    const conversation = await Conversation.findOne({ _id: id, userId }).lean();
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ conversation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load conversation" }, { status: 500 });
  }
}

