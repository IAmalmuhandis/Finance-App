"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/TopBar";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [month, setMonth] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<any>(null);

  async function load() {
    const r = await fetch("/api/reports");
    const j = await r.json();
    setReports(j.reports || []);
  }
  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((j) => {
      setAccounts(j.accounts || []);
      setSelectedAccounts((j.accounts || []).map((a: any) => a.id));
    });
    load();
  }, []);

  async function generate() {
    setLoading(true);
    const r = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: month || undefined, accountIds: selectedAccounts }),
    });
    if (!r.ok) toast.error("Report generation failed");
    else {
      const j = await r.json();
      setActive(j.report);
      toast.success("Report generated");
    }
    await load();
    setLoading(false);
  }

  return (
    <div className="p-8">
      <TopBar title="AI Audit Reports" />
      <div className="mt-6 rounded-xl border border-border-subtle bg-bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Generate AI Audit Report</h2>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <div className="mb-3 flex items-center justify-between"><p className="text-sm">Accounts</p><button onClick={() => setSelectedAccounts(accounts.map((a) => a.id))} className="text-xs underline">Select all</button></div>
            <div className="grid grid-cols-2 gap-2">
              {accounts.map((a) => (
                <label key={a.id} className="flex items-center gap-2 rounded border border-border-subtle bg-bg-input p-2 text-sm">
                  <input type="checkbox" checked={selectedAccounts.includes(a.id)} onChange={(e) => setSelectedAccounts((s) => e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id))} />
                  {a.bankName} - {a.nickname}
                </label>
              ))}
            </div>
          </div>
          <div>
            <input className="mb-3 w-full rounded border border-border-subtle bg-bg-input p-2" placeholder="YYYY-MM (optional)" value={month} onChange={(e) => setMonth(e.target.value)} />
            <button onClick={generate} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-blue py-2" disabled={loading}><Sparkles size={16} />{loading ? "Analyzing..." : "Generate Report"}</button>
          </div>
        </div>
      </div>

      {active ? (
        <div className="mt-4 rounded-xl border border-border-subtle bg-bg-surface p-5">
          <div className="mb-2 flex items-center justify-between"><h3 className="text-lg font-semibold">{active.title}</h3><button onClick={() => window.print()} className="rounded border border-border-subtle px-3 py-1 text-sm">Download PDF</button></div>
          <div className="grid gap-3 md:grid-cols-3">{["totalIncome","totalExpenses","netPosition","topCategory","savingsRate","transactionCount"].map((k) => <div key={k} className="rounded border border-border-subtle bg-bg-input p-3 text-sm"><p className="text-text-muted">{k}</p><p className="font-semibold">{String(active.content?.[k] ?? "-")}</p></div>)}</div>
          <div className="prose prose-invert mt-4 max-w-none"><ReactMarkdown>{`## Overview\n${active.content?.overview || ""}\n\n## Spending Patterns\n${active.content?.spendingPatterns || ""}\n\n## Risk Assessment\n${active.content?.riskAssessment || ""}`}</ReactMarkdown></div>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-border-subtle bg-bg-surface p-5">
        <h3 className="mb-3 text-lg font-semibold">Previous Reports</h3>
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r._id} className="flex items-center justify-between rounded border border-border-subtle bg-bg-input p-3 text-sm">
              <div><p>{new Date(r.createdAt).toLocaleString()}</p><p className="text-text-secondary">{r.month || "All Time"}</p></div>
              <button onClick={async () => { const rr = await fetch(`/api/reports/${r._id}`); const jj = await rr.json(); setActive(jj.report); }} className="rounded border border-border-subtle px-3 py-1">View</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
