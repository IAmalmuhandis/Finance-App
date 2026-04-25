import { NextResponse } from "next/server";
import { getGoogleOAuthClientSecret, getGoogleOAuthWebClientId } from "@/lib/google-client-id";

/** Lets clients show Google only when credentials exist; exposes public Web client ID for native/Expo OAuth. */
export async function GET() {
  const webClientId = getGoogleOAuthWebClientId();
  const google = Boolean(webClientId && getGoogleOAuthClientSecret());
  const googleMobile = Boolean(webClientId && process.env.NEXTAUTH_SECRET);
  return NextResponse.json({
    google,
    googleMobile,
    webClientId: webClientId || null,
  });
}
