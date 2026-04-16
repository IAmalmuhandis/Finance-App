import Papa from "papaparse";
import { z } from "zod";
import type { ParsedTransaction, TxnType } from "../types";

const Row = z.record(z.string(), z.any());

const dateKeys = ["date", "postedat", "posted_at", "transaction date", "transaction_date"];
const descKeys = ["description", "memo", "name", "details", "transaction", "merchant"];
const amountKeys = ["amount", "amt", "value"];
const debitKeys = ["debit"];
const creditKeys = ["credit"];
const typeKeys = ["type", "dr/cr", "direction"];

export function parseCsv(content: string): ParsedTransaction[] {
  const parsed = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (parsed.errors?.length) {
    // Keep going; best-effort parsing.
  }

  const rows = (parsed.data ?? []).map((r) => Row.parse(r));

  const txns: ParsedTransaction[] = [];
  for (const r of rows) {
    const dateRaw = pick(r, dateKeys);
    const descRaw = pick(r, descKeys);
    const amountRaw = pick(r, amountKeys);
    const debitRaw = pick(r, debitKeys);
    const creditRaw = pick(r, creditKeys);
    const typeRaw = pick(r, typeKeys);

    const postedAt = parseDate(dateRaw);
    const description = String(descRaw ?? "").trim();
    if (!postedAt || !description) continue;

    const { amount, type } = normalizeAmountAndType({ amountRaw, debitRaw, creditRaw, typeRaw });
    if (!amount || amount <= 0 || !type) continue;

    txns.push({ postedAt, description, amount, type });
  }

  return txns.sort((a, b) => a.postedAt.getTime() - b.postedAt.getTime());
}

function pick(row: Record<string, any>, keys: string[]) {
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]));
  for (const k of keys) {
    const v = lower[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

function parseDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  // Try MM/DD/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    const yy = Number(m[3]);
    const dt = new Date(yy, mm - 1, dd);
    if (!isNaN(dt.getTime())) return dt;
  }
  return null;
}

function normalizeAmountAndType(args: {
  amountRaw: any;
  debitRaw: any;
  creditRaw: any;
  typeRaw: any;
}): { amount: number | null; type: TxnType | null } {
  const debit = toNum(args.debitRaw);
  const credit = toNum(args.creditRaw);
  if (debit != null && debit > 0) return { amount: debit, type: "DEBIT" };
  if (credit != null && credit > 0) return { amount: credit, type: "CREDIT" };

  const amt = toNum(args.amountRaw);
  if (amt == null) return { amount: null, type: null };

  const typeHint = String(args.typeRaw ?? "").toUpperCase();
  if (typeHint.includes("DEB") || typeHint.includes("DR")) return { amount: Math.abs(amt), type: "DEBIT" };
  if (typeHint.includes("CRED") || typeHint.includes("CR")) return { amount: Math.abs(amt), type: "CREDIT" };

  // Fallback: negative = debit, positive = credit
  if (amt < 0) return { amount: Math.abs(amt), type: "DEBIT" };
  return { amount: Math.abs(amt), type: "CREDIT" };
}

function toNum(v: any): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "number" && !isNaN(v)) return v;
  const s = String(v).replace(/[, $]/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

