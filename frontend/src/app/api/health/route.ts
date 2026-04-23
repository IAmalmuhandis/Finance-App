import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasMongo = !!(
    process.env.MONGODB_DIRECT_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL
  );
  if (!hasMongo) {
    return NextResponse.json(
      { ok: false, error: "MONGODB_URI (or DATABASE_URL) is not configured", hasMongo: false, db: "unknown" },
      { status: 503 }
    );
  }
  try {
    await connectMongo();
    return NextResponse.json({ ok: true, hasMongo: true, db: "connected" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.json(
      { ok: false, error: message, hasMongo: true, db: "error" },
      { status: 503 }
    );
  }
}
