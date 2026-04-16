import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Conversation } from "@/lib/models/Conversation";

export async function GET() {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const conversations = await Conversation.find({ userId }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({
      conversations: conversations.map((c: any) => ({
        _id: c._id,
        title: c.title,
        createdAt: c.createdAt,
        preview: c.messages?.[0]?.content?.slice(0, 40) || "",
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load conversations" }, { status: 500 });
  }
}

