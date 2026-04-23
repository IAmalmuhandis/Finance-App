import crypto from "crypto";

const MOBILE_TOKEN_MAX_MS = 30 * 24 * 60 * 60 * 1000;

function timingSafeEqualString(a: string, b: string) {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function createMobileAccessToken(userId: string, secret: string) {
  const exp = Date.now() + MOBILE_TOKEN_MAX_MS;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp }), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyMobileAccessToken(token: string, secret: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (!timingSafeEqualString(sig, expected)) return null;
  try {
    const raw = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(raw) as { sub?: string; exp?: number };
    if (!data.sub || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data.sub;
  } catch {
    return null;
  }
}
