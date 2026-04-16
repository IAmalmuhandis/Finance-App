import pdf from "pdf-parse";
import type { ParsedTransaction } from "../types";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text ?? "";
}

// Heuristic parser: looks for lines like "03/15/2026 SOME MERCHANT -12.34" or "2026-03-15 ... 12.34"
export function parsePdfTextToTransactions(text: string): ParsedTransaction[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const txns: ParsedTransaction[] = [];

  for (const line of lines) {
    const m1 = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+(-?\$?\d[\d,]*\.\d{2})\s*$/);
    const m2 = line.match(/^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?\$?\d[\d,]*\.\d{2})\s*$/);
    const m = m1 ?? m2;
    if (!m) continue;

    const postedAt = parseDate(m[1]);
    const description = String(m[2] ?? "").trim();
    const amountSigned = parseMoney(m[3]);
    if (!postedAt || !description || amountSigned == null) continue;

    const type = amountSigned < 0 ? "DEBIT" : "CREDIT";
    const amount = Math.abs(amountSigned);
    if (amount === 0) continue;

    txns.push({ postedAt, description, amount, type });
  }

  return dedupe(txns).sort((a, b) => a.postedAt.getTime() - b.postedAt.getTime());
}

function parseMoney(s: string): number | null {
  const v = s.replace(/[$, ]/g, "").trim();
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function parseDate(s: string): Date | null {
  const v = s.trim();
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d;
  const mmddyyyy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mmddyyyy) {
    const mm = Number(mmddyyyy[1]);
    const dd = Number(mmddyyyy[2]);
    let yy = Number(mmddyyyy[3]);
    if (yy < 100) yy += 2000;
    const dt = new Date(yy, mm - 1, dd);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function dedupe(txns: ParsedTransaction[]) {
  const seen = new Set<string>();
  const out: ParsedTransaction[] = [];
  for (const t of txns) {
    const key = `${t.postedAt.toISOString().slice(0, 10)}|${t.description.toLowerCase()}|${t.amount}|${t.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

