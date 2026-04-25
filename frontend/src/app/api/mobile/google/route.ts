import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { getGoogleOAuthWebClientId } from "@/lib/google-client-id";
import { upsertUserFromGoogle } from "@/lib/google-user";
import { createMobileAccessToken } from "@/lib/mobile-token";
import { corsOptions, withCors } from "@/lib/api-cors";

export async function OPTIONS() {
  return corsOptions();
}

export async function POST(req: Request) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    const audience = getGoogleOAuthWebClientId();
    if (!secret || !audience) {
      return withCors(NextResponse.json({ error: "Google sign-in is not configured on this server" }, { status: 503 }));
    }

    const body = await req.json().catch(() => null);
    const idToken = typeof body?.idToken === "string" ? body.idToken.trim() : "";
    if (!idToken) {
      return withCors(NextResponse.json({ error: "idToken is required" }, { status: 400 }));
    }

    const client = new OAuth2Client(audience);
    const ticket = await client.verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      return withCors(NextResponse.json({ error: "Invalid Google token" }, { status: 401 }));
    }

    const userId = await upsertUserFromGoogle({
      email: payload.email,
      name: payload.name,
      googleSub: payload.sub,
    });

    const token = createMobileAccessToken(userId, secret);
    return withCors(NextResponse.json({ token, email: payload.email.toLowerCase() }));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Google sign-in failed";
    return withCors(NextResponse.json({ error: message }, { status: 401 }));
  }
}
