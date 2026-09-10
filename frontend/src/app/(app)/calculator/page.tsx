"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { BucketTree } from "@/components/calculator/BucketTree";
import { Button } from "@/components/ui/button";
import {
  type CalculatorMode,
  type FormulaNode,
  type Tier,
  STORAGE_CUSTOM_FORMULA,
  STORAGE_INCOME,
  STORAGE_MODE,
  computeAllocations,
  formatNaira,
  formatNairaInput,
  getDefaultCustomFormula,
  getFormulaForTier,
  parseNairaInput,
  validateTree,
} from "@/lib/calculator";

const TIER_ORDER: Tier[] = ["starter", "intermediate", "advance"];
const TABS: CalculatorMode[] = ["starter", "intermediate", "advance", "custom"];

const TAB_LABELS: Record<CalculatorMode, string> = {
  starter: "Starter",
  intermediate: "Intermediate",
  advance: "Advance",
  custom: "Custom",
};

const TIER_COPY: Record<Tier, string> = {
  starter: "Build the habit first. Every framework starts here.",
  intermediate: "You've held Starter for a while — time to raise the bar.",
  advance: "The full framework, for when it's proven it can stick.",
};

type NudgeStatus = { currentTier: string; nudge: { eligible: boolean; dismissed: boolean } } | null;

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

function loadMode(): CalculatorMode {
  if (typeof window === "undefined") return "starter";
  const raw = localStorage.getItem(STORAGE_MODE);
  if (raw && (TABS as string[]).includes(raw)) return raw as CalculatorMode;
  return "starter";
}

export default function CalculatorPage() {
  const [mode, setMode] = useState<CalculatorMode>("starter");
  const [incomeInput, setIncomeInput] = useState("");
  const [customFormula, setCustomFormula] = useState<FormulaNode[]>(getDefaultCustomFormula);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [nudge, setNudge] = useState<NudgeStatus>(null);
  const [nudgeDismissedLocally, setNudgeDismissedLocally] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_INCOME);
    if (saved) {
      const n = Number(saved);
      if (n > 0) setIncomeInput(formatNairaInput(String(n)));
    }
    setCustomFormula(loadCustomFormula());
    setMode(loadMode());
    setHydrated(true);
  }, []);

  const gross = parseNairaInput(incomeInput);
  const formula = mode === "custom" ? customFormula : getFormulaForTier(mode);
  const allocations = useMemo(() => computeAllocations(gross, formula), [gross, formula]);
  const canSave = gross > 0 && validateTree(formula) && allocations.length > 0;

  useEffect(() => {
    if (!hydrated) return;
    if (gross > 0) localStorage.setItem(STORAGE_INCOME, String(gross));
    if (mode === "custom") {
      localStorage.setItem(STORAGE_CUSTOM_FORMULA, JSON.stringify(customFormula));
    }
  }, [gross, customFormula, mode, hydrated]);

  // Persist selected tab + keep the server's tier record (used for the Graduate nudge) in sync.
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_MODE, mode);
    setNudgeDismissedLocally(false);
    fetch("/api/calculator/tier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: mode }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((j: NudgeStatus) => setNudge(j))
      .catch(() => {
        /* non-critical — nudge just won't show this session */
      });
  }, [mode, hydrated]);

  async function dismissNudge() {
    setNudgeDismissedLocally(true);
    try {
      await fetch("/api/calculator/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissNudge: true }),
      });
    } catch {
      /* local dismissal already applied */
    }
  }

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

  const showNudge =
    !nudgeDismissedLocally &&
    nudge?.nudge.eligible &&
    TIER_ORDER.includes(mode as Tier) &&
    nudge.currentTier === mode;
  const nudgeTierIdx = TIER_ORDER.indexOf(mode as Tier);
  const nextTier = nudgeTierIdx >= 0 ? TIER_ORDER[nudgeTierIdx + 1] : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-16 md:pt-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-jade">Calculator</h1>
        <p className="mt-1 text-sm text-text-secondary">Enter gross income and split it across your buckets.</p>
      </header>

      {showNudge && nextTier ? (
        <div className="mb-6 flex items-start gap-3 rounded-[16px] border border-gold/40 bg-gold-soft p-4">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">
              You&apos;ve been on {TAB_LABELS[mode]} for 90+ days. Ready to try {TAB_LABELS[nextTier]}?
            </p>
            <button
              type="button"
              onClick={() => setMode(nextTier)}
              className="mt-2 text-xs font-semibold text-jade underline underline-offset-2 hover:text-jade-deep"
            >
              Try {TAB_LABELS[nextTier]}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void dismissNudge()}
            className="shrink-0 rounded-md p-1 text-text-muted hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

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
          className="inline-flex flex-wrap rounded-[12px] border border-border-subtle bg-bg-input p-1"
          role="tablist"
          aria-label="Split mode"
        >
          {TABS.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-[10px] px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade ${
                mode === m
                  ? "bg-jade text-text-on-jade"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {TAB_LABELS[m]}
            </button>
          ))}
        </div>
        {mode !== "custom" ? (
          <p className="mt-2 text-xs text-text-muted">{TIER_COPY[mode]}</p>
        ) : (
          <p className="mt-2 text-xs text-text-muted">
            Build your own formula. Percentages are shown as % of total income. Child groups must sum to 100%.
          </p>
        )}
      </section>

      <section className="mb-6 space-y-3" aria-live="polite">
        {mode === "custom" ? (
          <BucketTree nodes={customFormula} gross={gross} editable onChange={setCustomFormula} />
        ) : (
          <BucketTree nodes={formula} gross={gross} editable={false} onChange={() => {}} />
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
