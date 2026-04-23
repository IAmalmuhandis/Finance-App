import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

/** URL from `EXPO_PUBLIC_API_BASE_URL` baked into the build via app.config `extra.apiBaseUrl`. */
export function getConfiguredApiBase(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return (extra?.apiBaseUrl || "").trim().replace(/\/$/, "");
}

const KEY_API = "vaultly_api_base";
const KEY_TOKEN = "vaultly_token";
const KEY_EMAIL = "vaultly_user_email";
const LEGACY_API = "tracker_api_base_url";
const LEGACY_TOKEN = "tracker_auth_token";

async function migrateLegacy() {
  const a = await AsyncStorage.getItem(LEGACY_API);
  const t = await AsyncStorage.getItem(LEGACY_TOKEN);
  if (a && !(await AsyncStorage.getItem(KEY_API))) await AsyncStorage.setItem(KEY_API, a);
  if (t && !(await AsyncStorage.getItem(KEY_TOKEN))) await AsyncStorage.setItem(KEY_TOKEN, t);
}

export async function getApiBase(): Promise<string> {
  await migrateLegacy();
  const fromStore = ((await AsyncStorage.getItem(KEY_API)) || "").trim().replace(/\/$/, "");
  if (fromStore) {
    return fromStore;
  }
  return getConfiguredApiBase();
}

export async function setApiBase(url: string) {
  const trimmed = url.trim().replace(/\/$/, "");
  if (trimmed) await AsyncStorage.setItem(KEY_API, trimmed);
  else await AsyncStorage.removeItem(KEY_API);
}

export async function getToken(): Promise<string> {
  await migrateLegacy();
  return (await AsyncStorage.getItem(KEY_TOKEN)) || "";
}

export async function setToken(token: string) {
  if (token) await AsyncStorage.setItem(KEY_TOKEN, token);
  else await AsyncStorage.removeItem(KEY_TOKEN);
}

export async function getUserEmail(): Promise<string> {
  return (await AsyncStorage.getItem(KEY_EMAIL)) || "";
}

export async function setUserEmail(email: string) {
  if (email) await AsyncStorage.setItem(KEY_EMAIL, email);
  else await AsyncStorage.removeItem(KEY_EMAIL);
}

function authHeaders(token: string, json = true) {
  const h: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

/** Prefer API JSON `{ error }` from route handlers; only then treat as HTML. */
function messageFromApiBody(body: string, status: number, fallback: string): string {
  const t = (body || "").trim();
  if (!t) {
    return fallback;
  }
  try {
    const j = JSON.parse(t) as { error?: string; message?: string };
    if (typeof j.error === "string" && j.error.length) {
      return j.error;
    }
    if (typeof j.message === "string" && j.message.length) {
      return j.message;
    }
  } catch {
    /* not JSON */
  }
  if (t.startsWith("<!DOCTYPE") || t.startsWith("<html") || t.includes("<!DOCTYPE html") || t.includes("data-next-head")) {
    return `Server returned a web page instead of JSON (HTTP ${status}). Set API base to your computer IP:port in sign-in, e.g. http://192.168.x.x:3000 (not "localhost" on a real phone), and ensure the app is running. If this persists, check the PC terminal for the real error.`;
  }
  return t.length > 240 ? `${t.slice(0, 240)}…` : t;
}

export async function apiRegister(
  base: string,
  email: string,
  password: string,
  name?: string
): Promise<{ error?: string }> {
  const b = base.replace(/\/$/, "");
  const r = await fetch(`${b}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: name?.trim() || undefined }),
  });
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  if (r.status === 409) return { error: j.error || "This email is already registered" };
  if (!r.ok) return { error: j.error || "Could not create account" };
  return {};
}

export async function apiLogin(
  base: string,
  email: string,
  password: string
): Promise<{ token?: string; error?: string }> {
  const b = base.replace(/\/$/, "");
  const r = await fetch(`${b}/api/mobile/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = (await r.json().catch(() => ({}))) as { token?: string; error?: string };
  if (!r.ok) return { error: j.error || "Sign in failed" };
  if (!j.token) return { error: "No token in response" };
  return { token: j.token };
}

export async function checkHealth(
  base: string
): Promise<{ ok: boolean; message: string; db?: string }> {
  const b = base.replace(/\/$/, "");
  try {
    const r = await fetch(`${b}/api/health`, { method: "GET" });
    const j = (await r.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      db?: string;
    };
    if (r.status === 503) {
      return { ok: false, message: j.error || "Server or database not ready", db: j.db };
    }
    if (!r.ok) return { ok: false, message: `HTTP ${r.status}` };
    return { ok: true, message: "Server OK", db: j.db };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Network error — use your PC LAN IP (not localhost on a phone)",
    };
  }
}

// --- API calls (authenticated) ---

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<{ data?: T; error?: string; status: number }> {
  const base = await getApiBase();
  const token = await getToken();
  if (!base || !token) {
    return { status: 401, error: "Not signed in (set server URL and log in again)" };
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const r = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(token),
      ...((init?.headers as Record<string, string>) || {}),
    },
  });
  const text = await r.text();
  if (r.status === 401) {
    return { status: 401, error: "Unauthorized" };
  }
  if (!r.ok) {
    return {
      status: r.status,
      error: messageFromApiBody(text, r.status, r.statusText || "Request failed"),
    };
  }
  try {
    const data = JSON.parse(text) as T;
    return { status: r.status, data };
  } catch {
    return {
      status: r.status,
      error: messageFromApiBody(text, r.status, "Invalid JSON from server"),
    };
  }
}

export type DashboardResponse = {
  stats: { totalIncome: number; totalExpenses: number; netPosition: number; savingsRate: number };
  prevStats?: { totalIncome: number; totalExpenses: number; netPosition: number; savingsRate: number };
  monthlyChart: { month: string; income: number; expenses: number }[];
  categoryChart: { category: string; amount: number }[];
  recentTransactions: unknown[];
  insights?: string[];
};

export function fetchDashboard(dateRange = "thisMonth") {
  return fetchJson<DashboardResponse>(`/api/dashboard?dateRange=${encodeURIComponent(dateRange)}`);
}

export type TransactionRow = {
  _id: string;
  amount: number;
  date: string;
  description: string;
  type: string;
  category?: string;
};

export type TransactionsResponse = {
  transactions: TransactionRow[];
  total: number;
  page: number;
  totalPages: number;
  summary: { totalCredit: number; totalDebit: number; net: number };
};

export function fetchTransactions(page = 1, search = "") {
  return fetchJson<TransactionsResponse>(
    `/api/transactions?page=${page}&search=${encodeURIComponent(search)}&limit=25`
  );
}

// ---- Tracker (Formula) ----

export type TrackerPayload = {
  income: number;
  formula: { stocks: number; emergency: number; obligations: number; food: number; flex: number };
  checkins: unknown[];
  monthlyLog: unknown[];
  persisted?: boolean;
};

export async function fetchTrackerData(): Promise<TrackerPayload | null> {
  const base = await getApiBase();
  const token = await getToken();
  if (!base || !token) return null;
  const r = await fetch(`${base}/api/tracker`, { headers: authHeaders(token) });
  const text = await r.text();
  if (!r.ok) return null;
  try {
    return JSON.parse(text) as TrackerPayload;
  } catch {
    return null;
  }
}

export async function putTrackerData(body: Omit<TrackerPayload, "persisted">) {
  const base = await getApiBase();
  const token = await getToken();
  if (!base || !token) return false;
  const r = await fetch(`${base}/api/tracker`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return r.ok;
}

// --- Accounts ---

export type BankAccount = {
  id: string;
  bankName: string;
  nickname: string;
  type: string;
  last4?: string;
  currency: string;
  color: string;
  transactionCount: number;
  totalIn: number;
  totalOut: number;
  lastUploadAt: string | null;
};

export function fetchAccounts() {
  return fetchJson<{ accounts: BankAccount[] }>("/api/accounts");
}

export function createAccount(body: {
  bankName: string;
  nickname: string;
  type: "PERSONAL" | "BUSINESS";
  last4?: string;
  currency: string;
  color: string;
}) {
  return fetchJson<{ account: unknown }>("/api/accounts", { method: "POST", body: JSON.stringify(body) });
}

export function deleteAccount(id: string) {
  return fetchJson<{ ok?: boolean }>(`/api/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// --- Statement upload (multipart) ---

export type UploadParseResponse = {
  transactions: unknown[];
  summary?: {
    count: number;
    totalCredit?: number;
    totalDebit?: number;
    month?: string;
    dateFrom?: string;
    dateTo?: string;
    net?: number;
  } | null;
  statementDocument?: unknown;
  error?: string;
};

export async function postStatementUpload(
  accountId: string,
  file: { uri: string; name: string; mimeType?: string | null },
  statementMonth?: string
): Promise<{ status: number; data?: UploadParseResponse; error?: string }> {
  const base = await getApiBase();
  const token = await getToken();
  if (!base || !token) {
    return { status: 401, error: "Not signed in" };
  }
  const form = new FormData();
  const mime = file.mimeType && file.mimeType.length > 0 ? file.mimeType : "application/octet-stream";
  form.append("file", { uri: file.uri, name: file.name, type: mime } as unknown as Blob);
  form.append("accountId", accountId);
  if (statementMonth) {
    form.append("statementMonth", statementMonth);
  }
  const r = await fetch(`${base}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  const text = await r.text();
  if (!r.ok) {
    return { status: r.status, error: messageFromApiBody(text, r.status, r.statusText || "Upload failed") };
  }
  try {
    return { status: r.status, data: JSON.parse(text) as UploadParseResponse };
  } catch {
    return { status: r.status, error: messageFromApiBody(text, r.status, "Invalid response from server") };
  }
}

export function postStatementConfirm(body: {
  transactions: unknown[];
  accountId: string;
  month?: string;
  sourceFileName: string;
  statementDocument: unknown;
}) {
  return fetchJson<{ saved: number }>("/api/upload/confirm", { method: "POST", body: JSON.stringify(body) });
}

// --- Reports ---

export type ReportRow = {
  _id: string;
  createdAt: string;
  month?: string;
  title: string;
  content: Record<string, unknown>;
};

export function fetchReports() {
  return fetchJson<{ reports: ReportRow[] }>("/api/reports");
}

export function fetchReportById(id: string) {
  return fetchJson<{ report: ReportRow }>(`/api/reports/${encodeURIComponent(id)}`);
}

export function postReportGenerate(body: { month?: string; accountIds: string[] }) {
  return fetchJson<{ report: ReportRow }>("/api/reports/generate", { method: "POST", body: JSON.stringify(body) });
}
