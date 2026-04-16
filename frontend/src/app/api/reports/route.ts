import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Report } from "@/lib/models/Report";

export async function GET() {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const reports = await Report.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ reports });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load reports" }, { status: 500 });
  }
}

