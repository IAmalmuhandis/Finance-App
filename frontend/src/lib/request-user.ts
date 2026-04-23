import { headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { verifyMobileAccessToken } from "./mobile-token";

export async function getRequestUserId() {
  const h = await headers();
  const auth = h.get("authorization");
  const secret = process.env.NEXTAUTH_SECRET;
  if (auth?.startsWith("Bearer ") && secret) {
    const raw = auth.slice(7).trim();
    const id = verifyMobileAccessToken(raw, secret);
    if (id) return id;
  }
  const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null;
  return session?.user?.id || "demo-user";
}

