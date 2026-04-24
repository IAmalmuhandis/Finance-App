import { NextResponse } from "next/server";

/** Lets the client show Google sign-in only when server credentials are configured. */
export async function GET() {
  const google = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return NextResponse.json({ google });
}
