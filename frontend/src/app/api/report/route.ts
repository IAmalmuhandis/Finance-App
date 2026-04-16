import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: "Use /api/reports instead." }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: "Use /api/reports/generate instead." }, { status: 410 });
}
