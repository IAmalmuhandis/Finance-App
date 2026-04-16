import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import Papa from "papaparse";
import pdfParse from "pdf-parse";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { Account } from "@/lib/models/Account";
import { categorize } from "@/lib/categorize";
import { format } from "date-fns";
import * as XLSX from "xlsx";

type ParsedTxn = {
  date: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  category: string;
};

type StatementDocument = {
  source: {
    fileName: string;
    fileType: string;
    fileSize: number;
    parserUsed: string;
    processedAt: string;
  };
  account: {
    id: string;
    bankName: string;
    nickname: string;
    currency: string;
  };
  statement: {
    month: string;
    periodStart: string;
    periodEnd: string;
    openingBalance: number | null;
    closingBalance: number | null;
    currentBalance: number | null;
    effectiveAvailableBalance: number | null;
    totalCredit: number | null;
    totalDebit: number | null;
    creditCount: number | null;
    debitCount: number | null;
    accountType: string;
    datePrinted: string;
    address: string;
    pageCount: number | null;
    accountNumber: string;
    accountHolder: string;
  };
  totals: {
    transactionCount: number;
    totalCredit: number;
    totalDebit: number;
  };
  parser: {
    detectedColumns: string[];
    aiUsed: boolean;
    fallbackUsed: boolean;
  };
  transactions: ParsedTxn[];
  rawText: string;
  extractedFields: Record<string, string | number | null>;
};

function normalizeDate(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) return format(parsed, "yyyy-MM-dd");
  const match = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (!match) return "";
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.valueOf())) return "";
  return format(dt, "yyyy-MM-dd");
}

function parseMoney(raw: unknown): number {
  const s = String(raw ?? "").replace(/[,\s]/g, "");
  const cleaned = s.replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function parseRecordRow(row: Record<string, unknown>): ParsedTxn | null {
  const entries = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), String(v ?? "").trim()]));
  const dateRaw = entries.date || entries["transaction date"] || entries.posted || entries.datetime || entries.value_date;
  const description = entries.description || entries.memo || entries.narration || entries.details || entries.remark || entries.remarks;
  const debit = parseMoney(entries.debit);
  const credit = parseMoney(entries.credit);
  const signedAmount = Number.isFinite(debit)
    ? -Math.abs(debit)
    : Number.isFinite(credit)
      ? Math.abs(credit)
      : parseMoney(entries.amount);
  if (!dateRaw || !description || !Number.isFinite(signedAmount)) return null;
  const date = normalizeDate(dateRaw);
  if (!date) return null;
  let type = entries.type?.toUpperCase() as "CREDIT" | "DEBIT";
  if (type !== "CREDIT" && type !== "DEBIT") type = signedAmount < 0 ? "DEBIT" : "CREDIT";
  return { date, description, amount: Math.abs(signedAmount), type, category: categorize(description) };
}

function parsePdfFallback(text: string): ParsedTxn[] {
  const out: ParsedTxn[] = [];
  for (const lineRaw of text.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line) continue;
    const dateMatch = line.match(/(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})/);
    const amountMatch = line.match(/(-?\d[\d,]*\.\d{2})/g);
    if (!dateMatch || !amountMatch?.length) continue;
    const date = normalizeDate(dateMatch[1]);
    if (!date) continue;
    const amountRaw = amountMatch[amountMatch.length - 1];
    const signedAmount = parseMoney(amountRaw);
    if (!Number.isFinite(signedAmount)) continue;
    const description = line
      .replace(dateMatch[1], "")
      .replace(amountRaw, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!description) continue;
    const type: "CREDIT" | "DEBIT" = signedAmount < 0 ? "DEBIT" : "CREDIT";
    out.push({ date, description, amount: Math.abs(signedAmount), type, category: categorize(description) });
  }
  return out;
}

function extractAccountNumber(text: string): string {
  const match =
    text.match(/account\s*(number|no\.?)\s*[:\-]?\s*([0-9*Xx-]{6,})/i) ||
    text.match(/\b\d{10,16}\b/);
  return match ? String(match[2] || match[0] || "").trim() : "";
}

function extractAccountHolder(text: string): string {
  const match = text.match(/account\s*name\s*[:\-]?\s*([A-Za-z .,'-]{4,80})/i);
  return match ? String(match[1] || "").trim() : "";
}

function extractBalance(text: string, label: "opening" | "closing"): number | null {
  const expr = label === "opening" ? /opening\s*balance[^0-9-]*(-?\d[\d,]*\.?\d{0,2})/i : /closing\s*balance[^0-9-]*(-?\d[\d,]*\.?\d{0,2})/i;
  const match = text.match(expr);
  if (!match) return null;
  const val = parseMoney(match[1]);
  return Number.isFinite(val) ? val : null;
}

function matchGroup(text: string, pattern: RegExp, group = 1): string {
  const m = text.match(pattern);
  return m?.[group] ? String(m[group]).trim() : "";
}

function extractCurrencyAmount(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  if (!m?.[1]) return null;
  const n = parseMoney(m[1]);
  return Number.isFinite(n) ? n : null;
}

function extractInteger(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  if (!m?.[1]) return null;
  const n = Number(String(m[1]).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function extractPageCount(text: string): number | null {
  const matches = [...text.matchAll(/--\s*\d+\s+of\s+(\d+)\s*--/gi)];
  if (!matches.length) return null;
  const last = matches[matches.length - 1]?.[1];
  const n = Number(last);
  return Number.isFinite(n) ? n : null;
}

function detectBank(text: string, fileName: string): string {
  const t = `${text}\n${fileName}`.toLowerCase();
  if (t.includes("kuda")) return "KUDA";
  if (t.includes("wema") || t.includes("alat")) return "WEMA";
  return "UNKNOWN";
}

function extractStatementMetadata(text: string, fileName: string) {
  const bank = detectBank(text, fileName);
  const accountNumber = extractAccountNumber(text) || matchGroup(text, /account\s*number\s*[:\-]?\s*(\d{8,16})/i);
  const accountHolder =
    extractAccountHolder(text) ||
    matchGroup(text, /account\s*name\s*[:\-]?\s*([^\n]+)/i) ||
    matchGroup(text, /Page\s+1\s+of\s+\d+\s+Account Number\s*:[^\n]+\n([^\n]{4,80})/i);
  const dateRange = matchGroup(text, /(\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}|\d{2}-[A-Za-z]{3}-\d{4}\s*-\s*\d{2}-[A-Za-z]{3}-\d{4})/i);
  const kudaMoneyIn = extractCurrencyAmount(text, /Money in\s+₦?([\d,]+\.\d{1,2})/i);
  const kudaMoneyOut = extractCurrencyAmount(text, /Money out\s+₦?([\d,]+\.\d{1,2})/i);
  const startDateRaw = matchGroup(text, /Start Date\s*\n?([^\n]+)/i) || (dateRange ? dateRange.split("-")[0]?.trim() : "");
  const endDateRaw = matchGroup(text, /End Date\s*\n?([^\n]+)/i) || (dateRange ? dateRange.split("-")[1]?.trim() : "");
  const periodStart = normalizeDate(startDateRaw) || normalizeDate(matchGroup(text, /(\d{2}\/\d{2}\/\d{2,4})\s*-\s*\d{2}\/\d{2}\/\d{2,4}/i));
  const periodEnd = normalizeDate(endDateRaw) || normalizeDate(matchGroup(text, /\d{2}\/\d{2}\/\d{2,4}\s*-\s*(\d{2}\/\d{2}\/\d{2,4})/i));
  const openingBalance = extractBalance(text, "opening");
  const closingBalance = extractBalance(text, "closing");
  const currentBalance = extractCurrencyAmount(text, /Current Balance\s*\n?₦?([\d,]+\.\d{1,2})/i) ?? closingBalance;
  const effectiveAvailableBalance = extractCurrencyAmount(text, /Effective Available Balance\s*\n?₦?([\d,]+\.\d{1,2})/i);
  const totalCredit = extractCurrencyAmount(text, /Total Credit\s*\n?₦?([\d,]+\.\d{1,2})/i) ?? kudaMoneyIn;
  const totalDebit = extractCurrencyAmount(text, /Total Debit\s*\n?₦?([\d,]+\.\d{1,2})/i) ?? kudaMoneyOut;
  const creditCount = extractInteger(text, /Credit Count\s*\n?(\d+)/i);
  const debitCount = extractInteger(text, /Debit Count\s*\n?(\d+)/i);
  const accountType = matchGroup(text, /Account Type\s*\n?([^\n]+)/i) || (bank === "KUDA" ? "Spend Account" : "");
  const datePrinted = matchGroup(text, /Date Printed\s*\n?([^\n]+)/i);
  const address = matchGroup(text, /Address\s*\n([\s\S]*?)\nAccount Number/i).replace(/\s+/g, " ").trim();
  const pageCount = extractPageCount(text);
  return {
    bank,
    accountNumber,
    accountHolder,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance,
    currentBalance,
    effectiveAvailableBalance,
    totalCredit,
    totalDebit,
    creditCount,
    debitCount,
    accountType,
    datePrinted,
    address,
    pageCount,
  };
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const form = await req.formData();
    const file = form.get("file");
    const accountId = String(form.get("accountId") ?? "");
    const statementMonth = String(form.get("statementMonth") ?? "");
    if (!(file instanceof File) || !accountId) return NextResponse.json({ error: "file and accountId are required" }, { status: 400 });

    const account = await Account.findOne({ _id: accountId, userId }).lean();
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let txns: ParsedTxn[] = [];
    let parserUsed = "unknown";
    let aiUsed = false;
    let fallbackUsed = false;
    let detectedColumns: string[] = [];
    let rawText = "";
    if (file.type.includes("csv") || file.name.toLowerCase().endsWith(".csv")) {
      const parsed = Papa.parse<Record<string, string>>(buffer.toString("utf8"), { header: true, skipEmptyLines: true });
      detectedColumns = Object.keys(parsed.data?.[0] || {});
      parserUsed = "csv";
      txns = (parsed.data || []).map((r) => parseRecordRow(r)).filter(Boolean) as ParsedTxn[];
    } else if (
      file.type.includes("sheet") ||
      file.type.includes("excel") ||
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls")
    ) {
      const wb = XLSX.read(buffer, { type: "buffer" });
      const first = wb.SheetNames[0];
      if (!first) return NextResponse.json({ error: "No sheets found in Excel file" }, { status: 400 });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[first], { defval: "" });
      detectedColumns = Object.keys(rows?.[0] || {});
      parserUsed = "excel";
      txns = rows.map((r) => parseRecordRow(r)).filter(Boolean) as ParsedTxn[];
    } else if (file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) {
      const pdf = await pdfParse(buffer);
      rawText = pdf.text || "";
      parserUsed = "pdf";
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const completion = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 3000,
            system:
              "You are a bank statement parser. Extract all transactions from the following bank statement text. Return ONLY a JSON array with no other text. Each item: { date: 'YYYY-MM-DD', description: string, amount: number (always positive), type: 'CREDIT' | 'DEBIT' }",
            messages: [{ role: "user", content: pdf.text }],
          });
          const text = completion.content.map((c: any) => ("text" in c ? c.text : "")).join("");
          const start = text.indexOf("[");
          const end = text.lastIndexOf("]");
          if (start !== -1 && end !== -1 && end > start) {
            const rows = JSON.parse(text.slice(start, end + 1));
            aiUsed = true;
            txns = rows
              .map((t: any) => ({
                date: normalizeDate(String(t.date || "")),
                description: String(t.description || "").trim(),
                amount: Math.abs(Number(t.amount)),
                type: t.type === "DEBIT" ? "DEBIT" : "CREDIT",
                category: categorize(String(t.description || "")),
              }))
              .filter((t: ParsedTxn) => Boolean(t.date && t.description) && Number.isFinite(t.amount));
          }
        } catch {
          txns = [];
        }
      }
      if (txns.length === 0) {
        fallbackUsed = true;
        txns = parsePdfFallback(pdf.text);
      }
    } else {
      return NextResponse.json({ error: "Only PDF/CSV/XLS/XLSX supported" }, { status: 400 });
    }

    if (txns.length === 0) return NextResponse.json({ error: "No transactions parsed from file" }, { status: 400 });
    const totalCredit = txns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const totalDebit = txns.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
    const month = statementMonth || format(new Date(txns[0].date), "yyyy-MM");
    const sortedDates = txns.map((t) => t.date).sort();
    const metadata = extractStatementMetadata(rawText, file.name);
    const statementMonthFromMeta = metadata.periodStart ? format(new Date(metadata.periodStart), "yyyy-MM") : month;
    const statementDocument: StatementDocument = {
      source: {
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        parserUsed,
        processedAt: new Date().toISOString(),
      },
      account: {
        id: String(account._id),
        bankName: String(account.bankName || ""),
        nickname: String(account.nickname || ""),
        currency: String(account.currency || "NGN"),
      },
      statement: {
        month: statementMonthFromMeta,
        periodStart: metadata.periodStart || sortedDates[0] || "",
        periodEnd: metadata.periodEnd || sortedDates[sortedDates.length - 1] || "",
        openingBalance: metadata.openingBalance,
        closingBalance: metadata.closingBalance,
        currentBalance: metadata.currentBalance,
        effectiveAvailableBalance: metadata.effectiveAvailableBalance,
        totalCredit: metadata.totalCredit,
        totalDebit: metadata.totalDebit,
        creditCount: metadata.creditCount,
        debitCount: metadata.debitCount,
        accountType: metadata.accountType,
        datePrinted: metadata.datePrinted,
        address: metadata.address,
        pageCount: metadata.pageCount,
        accountNumber: metadata.accountNumber,
        accountHolder: metadata.accountHolder,
      },
      totals: {
        transactionCount: txns.length,
        totalCredit,
        totalDebit,
      },
      parser: {
        detectedColumns,
        aiUsed,
        fallbackUsed,
      },
      transactions: txns,
      rawText,
      extractedFields: {
        bank: metadata.bank,
        accountNumber: metadata.accountNumber,
        accountHolder: metadata.accountHolder,
        accountType: metadata.accountType,
        openingBalance: metadata.openingBalance,
        closingBalance: metadata.closingBalance,
        currentBalance: metadata.currentBalance,
        effectiveAvailableBalance: metadata.effectiveAvailableBalance,
        totalCredit: metadata.totalCredit,
        totalDebit: metadata.totalDebit,
        creditCount: metadata.creditCount,
        debitCount: metadata.debitCount,
        datePrinted: metadata.datePrinted,
        address: metadata.address,
        pageCount: metadata.pageCount,
      },
    };
    return NextResponse.json({ transactions: txns, summary: { count: txns.length, totalCredit, totalDebit, month }, statementDocument });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Upload failed" }, { status: 400 });
  }
}
