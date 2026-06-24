"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatNaira } from "@/lib/calculator";
type ProgressData = {
  totalIncome: number;
  wealthRetained: number;
  totalGiven: number;
  totalSpend: number;
  entryCount: number;
  firstAt: string | null;
  lastAt: string | null;
  byBucket: { name: string; total: number }[];
  wealthSeries: { date: string; wealthRetained: number }[];
};

type EntryRow = {
  id: string;
  createdAt: string;
  grossAmount: number;
  mode: string;
};

function WealthChart({ series }: { series: { date: string; wealthRetained: number }[] }) {
  if (series.length < 2) return null;
  const max = Math.max(...series.map((p) => p.wealthRetained), 1);
  const w = 320;
  const h = 80;
  const barW = Math.max(8, Math.floor(w / series.length) - 4);

  return (
    <div className="mt-4" aria-hidden>
      <p className="mb-2 text-xs font-medium text-text-muted">Wealth retained over time</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md text-jade" role="img">
        <title>Wealth retained over time</title>
        {series.map((p, i) => {
          const barH = (p.wealthRetained / max) * (h - 8);
          const x = i * (barW + 4) + 2;
          return (
            <rect
              key={i}
              x={x}
              y={h - barH}
              width={barW}
              height={barH}
              rx={2}
              fill="currentColor"
              opacity={0.35 + (i / series.length) * 0.65}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    const [pRes, eRes] = await Promise.all([fetch("/api/entries/progress"), fetch("/api/entries")]);
    if (pRes.ok) setProgress(await pRes.json());
    if (eRes.ok) {
      const j = await eRes.json();
      setEntries(j.entries ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete entry");
      return;
    }
    toast.success("Entry removed");
    setLoading(true);
    await load();
  }

  async function clearAll() {
    if (!confirm("Clear all saved entries? This cannot be undone.")) return;
    setClearing(true);
    try {
      const res = await fetch("/api/entries", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("History cleared");
      await load();
    } catch {
      toast.error("Could not clear history");
    } finally {
      setClearing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-jade" aria-label="Loading" />
      </div>
    );
  }

  const empty = (progress?.entryCount ?? 0) === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-16 md:pt-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-jade">Progress</h1>
        <p className="mt-1 text-sm text-text-secondary">How your splits are adding up over time.</p>
      </header>

      {empty ? (
        <div className="rounded-[20px] border border-dashed border-border-subtle bg-bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-secondary">
            No entries yet — save your first split from the calculator to start tracking wealth retained.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-[20px] border border-gold/30 bg-gold-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-gold">Wealth retained</p>
              <p className="mt-1 font-display text-4xl font-semibold tabular-nums text-gold">
                {formatNaira(progress?.wealthRetained ?? 0)}
              </p>
            </div>
            <Stat label="Total income processed" value={formatNaira(progress?.totalIncome ?? 0)} />
            <Stat label="Entries saved" value={String(progress?.entryCount ?? 0)} />
            <Stat label="Total given" value={formatNaira(progress?.totalGiven ?? 0)} />
            <Stat label="Personal spending" value={formatNaira(progress?.totalSpend ?? 0)} />
          </section>

          {progress?.firstAt && progress?.lastAt ? (
            <p className="mb-4 text-xs text-text-muted">
              {format(new Date(progress.firstAt), "d MMM yyyy")} → {format(new Date(progress.lastAt), "d MMM yyyy")}
            </p>
          ) : null}

          <WealthChart series={progress?.wealthSeries ?? []} />

          {(progress?.byBucket?.length ?? 0) > 0 ? (
            <section className="mt-8">
              <h2 className="mb-3 font-display text-lg font-semibold text-jade">Per-bucket totals</h2>
              <ul className="space-y-2">
                {progress!.byBucket.map((b) => (
                  <li
                    key={b.name}
                    className="flex items-center justify-between rounded-[20px] border border-border-subtle bg-bg-surface px-4 py-2.5 text-sm"
                  >
                    <span className="text-text-primary">{b.name}</span>
                    <span className="font-medium tabular-nums text-text-primary">{formatNaira(b.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-jade">History</h2>
              <button
                type="button"
                onClick={() => void clearAll()}
                disabled={clearing}
                className="text-xs text-text-muted underline underline-offset-2 hover:text-accent-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
              >
                {clearing ? "Clearing…" : "Clear all"}
              </button>
            </div>
            <ul className="space-y-2">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{formatNaira(e.grossAmount)}</p>
                    <p className="text-xs text-text-muted">
                      {format(new Date(e.createdAt), "d MMM yyyy, HH:mm")} · {e.mode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteEntry(e.id)}
                    className="shrink-0 rounded-md p-2 text-text-muted hover:bg-accent-red/10 hover:text-accent-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
                    aria-label={`Delete entry from ${format(new Date(e.createdAt), "d MMM yyyy")}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border-subtle bg-bg-surface p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-medium tabular-nums text-text-primary">{value}</p>
    </div>
  );
}
