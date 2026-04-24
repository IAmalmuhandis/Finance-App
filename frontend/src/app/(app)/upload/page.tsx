"use client";
import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/TopBar";
import { UploadSkeleton } from "@/components/PageSkeletons";

export default function UploadPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountId, setAccountId] = useState("");
  const [month, setMonth] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [statementDocument, setStatementDocument] = useState<any>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((j) => {
        setAccounts(j.accounts || []);
        if (j.accounts?.[0]) setAccountId(j.accounts[0].id);
      })
      .catch(() => toast.error("Failed to load accounts"))
      .finally(() => setAccountsLoading(false));
  }, []);

  async function submit() {
    if (!file || !accountId) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("accountId", accountId);
    if (month) fd.set("statementMonth", month);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await r.json();
    if (!r.ok) return toast.error(j.error || "Upload failed");
    setParsed(j.transactions || []);
    setSummary(j.summary || null);
    setStatementDocument(j.statementDocument || null);
    toast.success(`Parsed ${j.summary?.count || 0} transactions`);
  }

  async function confirm() {
    const r = await fetch("/api/upload/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: parsed, accountId, month, sourceFileName: file?.name || "", statementDocument }),
    });
    const j = await r.json();
    if (!r.ok) return toast.error(j.error || "Save failed");
    toast.success(`Saved ${j.saved} transactions`);
    setParsed([]);
    setSummary(null);
    setStatementDocument(null);
  }

  if (accountsLoading) return <UploadSkeleton />;

  return (
    <div className="p-8">
      <TopBar title="Upload Statement" />
      <div className="mt-4 space-y-2 rounded-lg border border-border-subtle bg-bg-elevated/60 p-4 text-sm text-text-secondary">
        <p className="text-text-primary font-medium">No cloud AI is used</p>
        <p>
          CSV and Excel imports read your file by <span className="text-text-primary">column headers</span> (date, description, debit/credit, amount, etc.).
          PDFs use a <span className="text-text-primary">line-and-number pattern</span> on the text in the file; for best results use a CSV or Excel download from your bank.
        </p>
        <p className="text-text-muted text-xs">Scan-only or image PDFs: full OCR is not available yet (coming later).</p>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
          <p className="mb-2 text-sm text-text-secondary">Step 1 - Account selector</p>
          <select className="mb-3 w-full rounded-lg border border-border-subtle bg-bg-input p-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.bankName} — {a.nickname} ({a.type})</option>)}
          </select>
          <p className="mb-2 text-sm text-text-secondary">Step 2 - Statement month</p>
          <input className="mb-3 w-full rounded-lg border border-border-subtle bg-bg-input p-2" placeholder="2026-04" value={month} onChange={(e) => setMonth(e.target.value)} />
          <p className="mb-2 text-sm text-text-secondary">Step 3 - File dropzone</p>
          <label className="grid min-h-[180px] cursor-pointer place-items-center rounded-xl border border-dashed border-border-strong bg-bg-input p-4 text-center">
            <div>
              <Upload className="mx-auto mb-2 text-text-muted" size={40} />
              <p>Drop your PDF or CSV here</p>
              <p className="text-sm text-accent-blue underline">or click to browse</p>
            </div>
            <input className="hidden" type="file" accept=".pdf,.csv,.xls,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          {file ? <div className="mt-2 flex items-center justify-between rounded-lg bg-bg-elevated p-2 text-xs">{file.name}<button onClick={() => setFile(null)}><X size={14} /></button></div> : null}
          <button disabled={!file || !accountId} onClick={submit} className="mt-4 w-full rounded-lg bg-accent-blue py-2 disabled:opacity-50">Upload & Process</button>
        </div>

        <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
          {parsed.length === 0 ? (
            <div className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-border-subtle text-text-secondary">Your parsed transactions will appear here</div>
          ) : (
            <div>
              <p className="mb-3 text-sm">
                {summary?.count} transactions — ₦{summary?.totalCredit?.toLocaleString() ?? 0} in, ₦{summary?.totalDebit?.toLocaleString() ?? 0} out
                {typeof summary?.net === "number" ? `, net ₦${summary.net.toLocaleString()}` : ""}
                {summary?.dateFrom && summary?.dateTo ? ` · ${summary.dateFrom} → ${summary.dateTo}` : ""}
              </p>
              {statementDocument ? (
                <div className="mb-3 rounded-lg border border-border-subtle bg-bg-elevated p-2 text-xs text-text-secondary">
                  <p>Period: {statementDocument.statement?.periodStart || "-"} to {statementDocument.statement?.periodEnd || "-"}</p>
                  <p>Opening/Closing Balance: {statementDocument.statement?.openingBalance ?? "-"} / {statementDocument.statement?.closingBalance ?? "-"}</p>
                  <p>Parser: {statementDocument.source?.parserUsed || "-"}{" "}
                    {statementDocument.parser?.aiUsed
                      ? "(AI)"
                      : statementDocument.parser?.fallbackUsed
                        ? "(pattern-based / PDF text)"
                        : ""}
                  </p>
                </div>
              ) : null}
              <div className="max-h-[400px] overflow-auto rounded-lg border border-border-subtle">
                <table className="w-full text-sm">
                  <thead><tr className="bg-bg-elevated"><th className="p-2 text-left">Date</th><th className="p-2 text-left">Description</th><th className="p-2">Amount</th><th className="p-2">Type</th><th className="p-2">Category</th></tr></thead>
                  <tbody>
                    {parsed.map((t, i) => (
                      <tr key={i} className="border-t border-border-subtle">
                        <td className="p-2">{t.date}</td><td className="p-2">{t.description}</td><td className="p-2 text-right">{t.amount}</td><td className="p-2">{t.type}</td>
                        <td className="p-2"><input className="w-full rounded border border-border-subtle bg-bg-input px-2 py-1" value={t.category} onChange={(e) => setParsed((p) => p.map((x, idx) => idx === i ? { ...x, category: e.target.value } : x))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={confirm} className="mt-4 w-full rounded-lg bg-accent-blue py-2">Confirm & Save [{parsed.length}] Transactions</button>
              <button onClick={() => { setParsed([]); setSummary(null); setStatementDocument(null); }} className="mt-2 text-sm text-text-secondary underline">Discard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
