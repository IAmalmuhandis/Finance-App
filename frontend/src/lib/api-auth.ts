import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { verifyMobileAccessToken } from "./mobile-token";

function userIdFromBearer(req?: Request): string | null {
  if (!req) return null;
  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return verifyMobileAccessToken(auth.slice(7).trim(), secret);
}

export async function getAuthUserId(req?: Request): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null;
  if (session?.user?.id) return session.user.id;
  return userIdFromBearer(req);
}

export async function requireAuthUserId(req?: Request): Promise<string | NextResponse> {
  const id = await getAuthUserId(req);
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return id;
}
