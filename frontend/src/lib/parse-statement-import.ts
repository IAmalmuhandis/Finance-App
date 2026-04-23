import { categorize } from "@/lib/categorize";
import { format } from "date-fns";

/**
 * Heuristic statement import (no AI / no paid APIs). Used for text extracted
 * from PDFs via `pdf-parse` and similar.
 */
export type ImportTxn = {
  date: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  category: string;
};

function normalizeDate(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) return format(parsed, "yyyy-MM-dd");
  const mon = value.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})/i);
  if (mon) {
    const t = new Date(`${mon[2]} ${mon[1]}, ${mon[3].length === 2 ? `20${mon[3]}` : mon[3]}`);
    if (!Number.isNaN(t.valueOf())) return format(t, "yyyy-MM-dd");
  }
  const match = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (!match) return "";
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.valueOf())) return "";
  return format(dt, "yyyy-MM-dd");
}

const DEDUP = (a: ImportTxn) =>
  `${a.date}|${a.type}|${a.amount.toFixed(2)}|${a.description.slice(0, 80)}`.toLowerCase();

function parseMoneyLike(raw: string): number {
  const s = String(raw).replace(/[₦$£,\s]/g, "");
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Line-based parsing of flat text (e.g. PDF text layers). Picks date + last amount
 * on each line and a CREDIT/DEBIT hint from keywords.
 */
export function parseLineBasedStatementText(rawText: string): ImportTxn[] {
  const out: ImportTxn[] = [];
  for (const lineRaw of rawText.split(/\r?\n/)) {
    const line = lineRaw.replace(/\f/g, " ").trim();
    if (line.length < 8) continue;
    if (/^\s*page\s+\d+/i.test(line) || /^\s*statement\s*period/i.test(line)) {
      continue;
    }
    const dateMatch = line.match(
      /(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i
    );
    if (!dateMatch) continue;
    const date = normalizeDate(dateMatch[1]);
    if (!date) continue;
    const amountRe = /-?(?:₦\s*)?[\d,]+(?:\.\d{1,2})?\b/gi;
    const numCandidates: { raw: string; n: number; at: number }[] = [];
    let m: RegExpExecArray | null = amountRe.exec(line);
    while (m) {
      if (m[0] != null && m.index !== undefined) {
        const n = Math.abs(parseMoneyLike(m[0]));
        if (Number.isFinite(n) && n > 0 && n < 1_000_000_000) {
          numCandidates.push({ raw: m[0], n, at: m.index });
        }
      }
      m = amountRe.exec(line);
    }
    if (numCandidates.length === 0) {
      continue;
    }
    const { raw: amountRaw, n: lastAmt, at: amtAt } = numCandidates[numCandidates.length - 1];
    const dStr = dateMatch[0];
    const d0 = line.indexOf(dStr);
    const tLower = line.toLowerCase();
    let type: "CREDIT" | "DEBIT" = "DEBIT";
    if (/\b(cr|credit|inflow|reversal|refund|salary|deposit|received)\b/i.test(tLower) || tLower.includes("money in")) {
      type = "CREDIT";
    }
    if (/\b(dr|debit|outflow|withdraw|pos|payment|transfer out|debit order)\b/i.test(tLower) && !tLower.includes("reversal")) {
      type = "DEBIT";
    }
    if (amountRaw.trim().startsWith("-")) {
      type = "DEBIT";
    }
    let rest = "Transaction";
    if (d0 >= 0 && amtAt > d0 + dStr.length) {
      rest = line.slice(d0 + dStr.length, amtAt);
    } else {
      rest = line.replace(dStr, "").replace(amountRaw, " ");
    }
    rest = rest.replace(/-?(?:₦\s*)?[\d,]+(?:\.\d{1,2})?\b/g, " ").replace(/\s+/g, " ").trim() || "Transaction";
    if (rest.length < 1) {
      rest = "Transaction";
    }
    out.push({
      date,
      description: rest.slice(0, 500),
      amount: lastAmt,
      type,
      category: categorize(rest),
    });
  }
  return mergeAndDedupeTxns([out]);
}

/**
 * Merges arrays and removes near-duplicates (same date+type+amount+description start).
 */
export function mergeAndDedupeTxns(chunks: ImportTxn[][]): ImportTxn[] {
  const seen = new Set<string>();
  const out: ImportTxn[] = [];
  for (const ch of chunks) {
    for (const t of ch) {
      const k = DEDUP(t);
      if (seen.has(k)) {
        continue;
      }
      seen.add(k);
      out.push(t);
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description));
  return out;
}
