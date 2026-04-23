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
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{active.title}</h3>
            <button type="button" onClick={() => window.print()} className="rounded border border-border-subtle px-3 py-1 text-sm">Print / Save as PDF</button>
          </div>
          {active.content?.financialAudit ? (
            <div className="mb-4 rounded-lg border border-border-subtle bg-bg-elevated p-4">
              <h4 className="mb-2 text-sm font-semibold text-text-primary">Automated audit (rule-based)</h4>
              <p className="text-sm text-text-secondary">Health score: <span className="font-bold text-text-primary">{active.content.financialAudit.healthScore}/100</span> ({active.content.financialAudit.healthLabel})</p>
              {active.content.financialAudit.flags?.length ? (
                <ul className="mt-2 list-inside list-disc text-sm text-text-secondary">
                  {active.content.financialAudit.flags.map((f: { code: string; level: string; message: string }, i: number) => (
                    <li key={i}><span className="text-text-muted">[{f.level}]</span> {f.message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {active.content?.executiveSummary ? (
            <p className="mb-3 text-sm leading-relaxed text-text-secondary"><span className="font-semibold text-text-primary">Executive summary: </span>{active.content.executiveSummary}</p>
          ) : null}
          {active.content?.financialStatus?.narrative ? (
            <p className="mb-3 text-sm leading-relaxed text-text-secondary"><span className="font-semibold text-text-primary">Status: </span>{active.content.financialStatus.narrative}</p>
          ) : null}
          {active.content?.auditFindings?.length ? (
            <div className="mb-3">
              <h4 className="mb-1 text-sm font-semibold">Audit findings</h4>
              <ul className="space-y-1 text-sm text-text-secondary">
                {active.content.auditFindings.map(
                  (a: { severity: string; area: string; finding: string; evidence: string }, i: number) => (
                    <li key={i} className="rounded border border-border-subtle bg-bg-input p-2">
                      <span className="text-xs text-accent-amber">[{a.severity}] {a.area}</span>
                      <p className="text-text-primary">{a.finding}</p>
                      <p className="text-xs text-text-muted">{a.evidence}</p>
                    </li>
                  )
                )}
              </ul>
            </div>
          ) : null}
          {active.content?.detailedReconciliation ? (
            <p className="mb-3 text-sm leading-relaxed text-text-secondary">
              <span className="font-semibold text-text-primary">Reconciliation: </span>
              {active.content.detailedReconciliation}
            </p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            {["totalIncome", "totalExpenses", "netPosition", "topCategory", "savingsRate", "transactionCount"].map((k) => (
              <div key={k} className="rounded border border-border-subtle bg-bg-input p-3 text-sm">
                <p className="text-text-muted">{k}</p>
                <p className="font-semibold">{String(active.content?.[k] ?? "-")}</p>
              </div>
            ))}
          </div>
          <div className="prose prose-invert mt-4 max-w-none">
            <ReactMarkdown>{`## Overview\n${active.content?.overview || ""}\n\n## Spending patterns\n${active.content?.spendingPatterns || ""}\n\n## Risk\n${active.content?.riskAssessment || ""}`}</ReactMarkdown>
          </div>
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
