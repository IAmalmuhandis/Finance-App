export type FlashcardCategory = "mindset" | "habits" | "assets" | "behavior" | "saving";

/** FNV-1a 32-bit hash — good enough distribution for picking a daily index, not for security. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic per (user, calendar day) — same user always sees the same card on the same date. */
export function pickDailyCardIndex(userId: string, dateStr: string, count: number): number {
  if (count <= 0) return 0;
  return hashString(`${userId}:${dateStr}`) % count;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(s: string | null | undefined): s is string {
  return typeof s === "string" && DATE_RE.test(s);
}

export function todayUtcStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parses a "YYYY-MM-DD" string as a UTC midnight Date so day-diff math is unambiguous. */
export function parseDateStr(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDateStr(b).getTime() - parseDateStr(a).getTime()) / 86_400_000);
}
