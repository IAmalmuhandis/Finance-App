import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Report } from "@/lib/models/Report";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await connectMongo();
    const userId = await getRequestUserId();
    const report = await Report.findOne({ _id: id, userId }).lean();
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    return NextResponse.json({ report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load report" }, { status: 500 });
  }
}

