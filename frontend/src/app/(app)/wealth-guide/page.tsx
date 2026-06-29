"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatNaira, formatNairaInput, parseNairaInput } from "@/lib/calculator";
import {
  type ProjectionInput,
  type ProjectionSummary,
  type TransactionRow,
  computeProjection,
} from "@/lib/wealth-guide";

// ── Types ─────────────────────────────────────────────────────────────────────

type SavedProjection = {
  id: string;
  name?: string;
  createdAt: string;
  summary: ProjectionSummary;
  input: ProjectionInput;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-[140px] rounded-[16px] border border-border-subtle bg-bg-surface p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-text-primary">{value}</p>
      {sub ? <p className="text-xs text-text-secondary mt-0.5">{sub}</p> : null}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WealthGuidePage() {
  // Inputs
  const [initialCapitalInput, setInitialCapitalInput] = useState("");
  const [incomeRate, setIncomeRate] = useState("10");
  const [consumptionRate, setConsumptionRate] = useState("8");
  const [additionalCapitalRate, setAdditionalCapitalRate] = useState("2");
  const [numTransactions, setNumTransactions] = useState("12");
  const [targetWealthInput, setTargetWealthInput] = useState("");

  // Results
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [summary, setSummary] = useState<ProjectionSummary | null>(null);
  const [lastInput, setLastInput] = useState<ProjectionInput | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Save
  const [projectionName, setProjectionName] = useState("");
  const [saving, setSaving] = useState(false);

  // History
  const [history, setHistory] = useState<SavedProjection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/projections");
      if (res.ok) {
        const j = (await res.json()) as { projections: SavedProjection[] };
        setHistory(j.projections);
      }
    } catch {
      /* */
    } finally {
      setLoadingHistory(false);
    }
  }

  function generate() {
    const initialCapital = parseNairaInput(initialCapitalInput);
    if (initialCapital <= 0) {
      toast.error("Enter a valid initial capital");
      return;
    }
    const n = Math.min(Math.max(1, Number(numTransactions) || 1), 500);
    const input: ProjectionInput = {
      initialCapital,
      incomeRate: Number(incomeRate) || 0,
      consumptionRate: Number(consumptionRate) || 0,
      additionalCapitalRate: Number(additionalCapitalRate) || 0,
      numTransactions: n,
      targetWealth: parseNairaInput(targetWealthInput) || undefined,
    };
    const { rows: r, summary: s } = computeProjection(input);
    setRows(r);
    setSummary(s);
    setLastInput(input);
    setShowAll(false);
  }

  async function saveProjection() {
    if (!summary || !lastInput || rows.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/projections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectionName.trim() || undefined,
          input: lastInput,
          summary,
          rows: rows.slice(0, 200),
        }),
      });
      if (!res.ok) throw new Error("Could not save");
      toast.success("Projection saved");
      setProjectionName("");
      void loadHistory();
    } catch {
      toast.error("Could not save projection");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProjection(id: string) {
    try {
      await fetch(`/api/projections/${id}`, { method: "DELETE" });
      setHistory((h) => h.filter((p) => p.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  async function loadProjection(id: string) {
    try {
      const res = await fetch(`/api/projections/${id}`);
      if (!res.ok) return;
      const j = (await res.json()) as { projection: SavedProjection & { rows: TransactionRow[] } };
      const p = j.projection;
      setInitialCapitalInput(formatNairaInput(String(p.input.initialCapital)));
      setIncomeRate(String(p.input.incomeRate));
      setConsumptionRate(String(p.input.consumptionRate));
      setAdditionalCapitalRate(String(p.input.additionalCapitalRate));
      setNumTransactions(String(p.input.numTransactions));
      setTargetWealthInput(p.input.targetWealth ? formatNairaInput(String(p.input.targetWealth)) : "");
      setRows(p.rows);
      setSummary(p.summary);
      setLastInput(p.input);
      setShowAll(false);
      toast.success("Projection loaded");
    } catch {
      toast.error("Could not load projection");
    }
  }

  const displayRows = showAll ? rows : rows.slice(0, 20);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-16 md:pt-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-jade">Wealth Guide</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Project how your wealth grows (or shrinks) over multiple transactions.
        </p>
      </header>

      {/* ── Section 1: Inputs ──────────────────────────────────────────────── */}
      <section className="mb-8 rounded-[20px] border border-border-subtle bg-bg-surface p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">Inputs</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Initial Capital (₦)</label>
            <input
              className="w-full rounded-[12px] border border-border-subtle bg-bg-input px-3 py-2.5 text-sm tabular-nums text-text-primary outline-none focus:border-jade focus:ring-1 focus:ring-jade/30"
              inputMode="numeric"
              value={initialCapitalInput}
              onChange={(e) => setInitialCapitalInput(formatNairaInput(e.target.value))}
              placeholder="e.g. 1,000,000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Income Rate (%) <span className="text-text-muted font-normal">— return on capital per transaction</span>
            </label>
            <input
              className="w-full rounded-[12px] border border-border-subtle bg-bg-input px-3 py-2.5 text-sm tabular-nums text-text-primary outline-none focus:border-jade focus:ring-1 focus:ring-jade/30"
              type="number"
              min={0}
              step={0.1}
              value={incomeRate}
              onChange={(e) => setIncomeRate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Consumption Rate (%) <span className="text-text-muted font-normal">— amount consumed per transaction</span>
            </label>
            <input
              className="w-full rounded-[12px] border border-border-subtle bg-bg-input px-3 py-2.5 text-sm tabular-nums text-text-primary outline-none focus:border-jade focus:ring-1 focus:ring-jade/30"
              type="number"
              min={0}
              step={0.1}
              value={consumptionRate}
              onChange={(e) => setConsumptionRate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Additional Capital Rate (%) <span className="text-text-muted font-normal">— external money added per transaction</span>
            </label>
            <input
              className="w-full rounded-[12px] border border-border-subtle bg-bg-input px-3 py-2.5 text-sm tabular-nums text-text-primary outline-none focus:border-jade focus:ring-1 focus:ring-jade/30"
              type="number"
              min={0}
              step={0.1}
              value={additionalCapitalRate}
              onChange={(e) => setAdditionalCapitalRate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Number of Transactions (max 500)</label>
            <input
              className="w-full rounded-[12px] border border-border-subtle bg-bg-input px-3 py-2.5 text-sm tabular-nums text-text-primary outline-none focus:border-jade focus:ring-1 focus:ring-jade/30"
              type="number"
              min={1}
              max={500}
              value={numTransactions}
              onChange={(e) => setNumTransactions(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Target Wealth (₦) <span className="text-text-muted font-normal">— optional goal</span>
            </label>
            <input
              className="w-full rounded-[12px] border border-border-subtle bg-bg-input px-3 py-2.5 text-sm tabular-nums text-text-primary outline-none focus:border-jade focus:ring-1 focus:ring-jade/30"
              inputMode="numeric"
              value={targetWealthInput}
              onChange={(e) => setTargetWealthInput(formatNairaInput(e.target.value))}
              placeholder="optional"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          className="w-full rounded-[14px] bg-jade py-3 text-sm font-semibold text-text-on-jade transition hover:bg-jade/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
        >
          Generate Projection
        </button>
      </section>

      {/* ── Section 2: Status ──────────────────────────────────────────────── */}
      {summary && lastInput ? (
        <section className="mb-8 space-y-4">
          <div className="flex flex-wrap gap-3">
            <StatCard label="Final Capital" value={formatNaira(Math.round(summary.finalCapital))} sub={`${pct(summary.netGrowthPct)} net growth`} />
            <StatCard label="Total Income Earned" value={formatNaira(Math.round(summary.totalIncome))} />
            <StatCard label="Total Consumed" value={formatNaira(Math.round(summary.totalConsumption))} />
            <StatCard label="Total Added Externally" value={formatNaira(Math.round(summary.totalAdditional))} />
          </div>

          {/* Health bar */}
          <div className={`rounded-[16px] border p-4 ${summary.isGrowing ? "border-jade/30 bg-jade/5" : "border-accent-red/30 bg-accent-red/5"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">Wealth Health</span>
              <span className={`text-sm font-semibold ${summary.isGrowing ? "text-jade" : "text-accent-red"}`}>
                {summary.isGrowing ? "Growing" : "Shrinking"}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-bg-elevated overflow-hidden">
              <div
                className={`h-full rounded-full ${summary.isGrowing ? "bg-jade" : "bg-accent-red"}`}
                style={{ width: `${Math.min(Math.abs(summary.netGrowthPct), 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              {summary.isGrowing
                ? `Income (${pct(lastInput.incomeRate)}) + external (${pct(lastInput.additionalCapitalRate)}) exceeds consumption (${pct(lastInput.consumptionRate)}) — your wealth is building.`
                : `Your consumption (${pct(lastInput.consumptionRate)}) exceeds income (${pct(lastInput.incomeRate)}) + external (${pct(lastInput.additionalCapitalRate)}) — reduce consumption to start building wealth.`}
            </p>
          </div>

          {/* Target */}
          {lastInput.targetWealth ? (
            <div className={`rounded-[14px] border px-4 py-3 text-sm ${summary.targetReachedAt !== null ? "border-jade/30 bg-jade/5 text-jade" : "border-border-subtle bg-bg-surface text-text-secondary"}`}>
              {summary.targetReachedAt !== null
                ? `You'll reach your goal of ${formatNaira(lastInput.targetWealth)} at transaction #${summary.targetReachedAt}.`
                : `Goal of ${formatNaira(lastInput.targetWealth)} not reached within ${lastInput.numTransactions} transactions.`}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Section 3: Table ────────────────────────────────────────────────── */}
      {rows.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Transaction Table</h2>
          <div className="overflow-x-auto rounded-[16px] border border-border-subtle">
            <table className="w-full min-w-[600px] text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated">
                  {["#", "Initial Capital", "+Added", "+Income", "−Consumed", "New Capital"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => {
                  const growing = row.newCapital >= row.initialCapital;
                  return (
                    <tr key={row.no} className="border-b border-border-subtle last:border-0 even:bg-bg-elevated/40">
                      <td className="px-3 py-2 tabular-nums text-text-muted">{row.no}</td>
                      <td className="px-3 py-2 tabular-nums text-text-primary">{formatNaira(Math.round(row.initialCapital))}</td>
                      <td className="px-3 py-2 tabular-nums text-jade">{formatNaira(Math.round(row.additionalCapital))}</td>
                      <td className="px-3 py-2 tabular-nums text-jade">{formatNaira(Math.round(row.income))}</td>
                      <td className="px-3 py-2 tabular-nums text-accent-red">{formatNaira(Math.round(row.consumption))}</td>
                      <td className={`px-3 py-2 tabular-nums font-medium ${growing ? "text-jade" : "text-accent-red"}`}>
                        {formatNaira(Math.round(row.newCapital))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length > 20 && !showAll ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 w-full rounded-[12px] border border-border-subtle py-2.5 text-xs text-text-secondary hover:border-border-strong hover:text-text-primary"
            >
              Show all {rows.length} rows
            </button>
          ) : null}

          {/* Save projection */}
          <div className="mt-4 flex gap-2">
            <input
              className="flex-1 rounded-[12px] border border-border-subtle bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:border-jade focus:ring-1 focus:ring-jade/30 placeholder:text-text-muted"
              placeholder="Name this projection (optional)"
              value={projectionName}
              onChange={(e) => setProjectionName(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void saveProjection()}
              disabled={saving}
              className="flex items-center gap-2 rounded-[12px] bg-jade px-4 py-2 text-sm font-medium text-text-on-jade hover:bg-jade/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </button>
          </div>
        </section>
      ) : null}

      {/* ── History ──────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Saved Projections</h2>
        {loadingHistory ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-text-muted" /></div>
        ) : history.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">No saved projections yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-[16px] border border-border-subtle bg-bg-surface px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{p.name || "Untitled projection"}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(p.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}Final: {formatNaira(Math.round(p.summary.finalCapital))}
                    {" · "}{pct(p.summary.netGrowthPct)} growth
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadProjection(p.id)}
                  className="text-xs text-jade hover:underline shrink-0"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => void deleteProjection(p.id)}
                  className="shrink-0 rounded-md p-1 text-text-muted hover:bg-accent-red/10 hover:text-accent-red"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
