/** Public Google OAuth *Web client* ID used for NextAuth, mobile ID tokens, and `/api/auth/social-config`. */
export function getGoogleOAuthWebClientId(): string {
  const candidates = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.AUTH_GOOGLE_ID,
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  ];
  for (const c of candidates) {
    const t = (c || "").trim();
    if (t) return t;
  }
  return "";
}

/** Server-only Google OAuth client secret (Web client). */
export function getGoogleOAuthClientSecret(): string {
  const candidates = [process.env.GOOGLE_CLIENT_SECRET, process.env.AUTH_GOOGLE_SECRET];
  for (const c of candidates) {
    const t = (c || "").trim();
    if (t) return t;
  }
  return "";
}
