"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { BucketTree, RecommendedBuckets } from "@/components/calculator/BucketTree";
import { Button } from "@/components/ui/button";
import {
  type CalculatorMode,
  type FormulaNode,
  STORAGE_CUSTOM_FORMULA,
  STORAGE_INCOME,
  computeAllocations,
  formatNaira,
  formatNairaInput,
  getDefaultCustomFormula,
  getRecommendedFormula,
  isSiblingsValid,
  parseNairaInput,
} from "@/lib/calculator";

function loadCustomFormula(): FormulaNode[] {
  if (typeof window === "undefined") return getDefaultCustomFormula();
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_FORMULA);
    if (raw) return JSON.parse(raw) as FormulaNode[];
  } catch {
    /* ignore */
  }
  return getDefaultCustomFormula();
}

function validateTree(nodes: FormulaNode[]): boolean {
  if (!isSiblingsValid(nodes)) return false;
  for (const n of nodes) {
    if (n.children && n.children.length > 0) {
      if (!validateTree(n.children)) return false;
    }
  }
  return true;
}

export default function CalculatorPage() {
  const [mode, setMode] = useState<CalculatorMode>("recommended");
  const [incomeInput, setIncomeInput] = useState("");
  const [customFormula, setCustomFormula] = useState<FormulaNode[]>(getDefaultCustomFormula);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_INCOME);
    if (saved) {
      const n = Number(saved);
      if (n > 0) setIncomeInput(formatNairaInput(String(n)));
    }
    setCustomFormula(loadCustomFormula());
    setHydrated(true);
  }, []);

  const gross = parseNairaInput(incomeInput);
  const formula = mode === "recommended" ? getRecommendedFormula() : customFormula;
  const allocations = useMemo(() => computeAllocations(gross, formula), [gross, formula]);
  const canSave = gross > 0 && validateTree(formula) && allocations.length > 0;

  useEffect(() => {
    if (!hydrated) return;
    if (gross > 0) localStorage.setItem(STORAGE_INCOME, String(gross));
    if (mode === "custom") localStorage.setItem(STORAGE_CUSTOM_FORMULA, JSON.stringify(customFormula));
  }, [gross, customFormula, mode, hydrated]);

  async function saveEntry() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grossAmount: gross,
          mode,
          formulaSnapshot: formula,
          allocations: allocations.map(({ name, type, amount }) => ({ name, type, amount })),
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Could not save");
      }
      toast.success("Entry saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  const customInvalid = mode === "custom" && !validateTree(customFormula);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-16 md:pt-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-jade">Calculator</h1>
        <p className="mt-1 text-sm text-text-secondary">Enter gross income and split it across your buckets.</p>
      </header>

      <section className="mb-6 rounded-[20px] border border-border-subtle bg-bg-surface p-4">
        <label htmlFor="gross-income" className="block text-sm font-medium text-text-primary">
          Total gross income (₦)
        </label>
        <input
          id="gross-income"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 900,000"
          value={incomeInput}
          onChange={(e) => setIncomeInput(formatNairaInput(e.target.value))}
          className="mt-2 w-full rounded-[12px] border border-border-subtle bg-bg-input px-3 py-3 text-lg font-medium tabular-nums text-text-primary outline-none transition placeholder:text-text-muted focus:border-jade focus:ring-1 focus:ring-jade/30"
        />
        {gross > 0 ? (
          <p className="mt-2 text-xs text-text-muted">Parsing as {formatNaira(gross)}</p>
        ) : null}
      </section>

      <section className="mb-6">
        <div
          className="inline-flex rounded-[12px] border border-border-subtle bg-bg-input p-1"
          role="tablist"
          aria-label="Split mode"
        >
          {(["recommended", "custom"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-[10px] px-4 py-2 text-sm font-medium capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade ${
                mode === m
                  ? "bg-jade text-text-on-jade"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {m === "recommended" ? "Recommended" : "Custom"}
            </button>
          ))}
        </div>
        {mode === "recommended" ? (
          <p className="mt-2 text-xs text-text-muted">
            Default split: one third investment, one third personal needs, and the final third divided equally
            between family, sadaqah, and emergency.
          </p>
        ) : (
          <p className="mt-2 text-xs text-text-muted">
            Build your own nested formula. Child percentages are relative to their parent and must sum to 100% per
            group.
          </p>
        )}
      </section>

      <section className="mb-6 space-y-3" aria-live="polite">
        {mode === "recommended" ? (
          <RecommendedBuckets gross={gross} />
        ) : (
          <BucketTree nodes={customFormula} gross={gross} editable onChange={setCustomFormula} />
        )}
      </section>

      {customInvalid ? (
        <p className="mb-4 text-sm text-accent-amber">Fix percentage groups before saving — each sibling group must sum to 100%.</p>
      ) : null}

      {gross > 0 && canSave ? (
        <div className="sticky bottom-4 z-10 rounded-[20px] border border-border-subtle bg-bg-surface/95 p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-text-secondary">Total allocated</span>
            <span className="font-medium tabular-nums text-text-primary">
              {formatNaira(allocations.reduce((s, a) => s + a.amount, 0))}
            </span>
          </div>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void saveEntry()}
            className="h-11 w-full rounded-[14px] bg-gold text-jade-deep hover:bg-gold/90"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Save size={16} aria-hidden />
                Save entry
              </span>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
