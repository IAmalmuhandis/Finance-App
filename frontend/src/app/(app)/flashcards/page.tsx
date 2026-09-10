"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";

type CardData = { id?: string; front: string; back?: string; source: string; category: string };
type TodayResponse = { date: string; card: CardData; seen: boolean; streak: number };
type HistoryDay = { date: string; card: { front: string; source: string; category: string }; seen: boolean };

const CATEGORY_LABELS: Record<string, string> = {
  mindset: "Mindset",
  habits: "Habits",
  assets: "Assets",
  behavior: "Behavior",
  saving: "Saving",
};

function todayLocalStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function FlashcardsPage() {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [marking, setMarking] = useState(false);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    void loadToday();
    void loadHistory();
  }, []);

  async function loadToday() {
    setLoading(true);
    try {
      const date = todayLocalStr();
      const res = await fetch(`/api/flashcards/today?date=${date}`);
      if (res.ok) {
        const j = (await res.json()) as TodayResponse;
        setToday(j);
        setFlipped(j.seen);
      } else if (res.status !== 404) {
        toast.error("Could not load today's card");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const end = todayLocalStr();
      const res = await fetch(`/api/flashcards/history?end=${end}&days=30`);
      if (res.ok) {
        const j = (await res.json()) as { days: HistoryDay[] };
        setHistory(j.days);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  async function reveal() {
    if (flipped || !today) return;
    setFlipped(true);
    setMarking(true);
    try {
      const res = await fetch("/api/flashcards/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today.date }),
      });
      if (res.ok) {
        const j = (await res.json()) as { streak: number };
        setToday((prev) => (prev ? { ...prev, seen: true, streak: j.streak } : prev));
        void loadHistory();
      }
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-jade" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-16 md:pt-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-jade">Flashcards</h1>
          <p className="mt-1 text-sm text-text-secondary">One principle a day, tied back to your split.</p>
        </div>
        {today ? (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-gold/40 bg-gold-soft px-3 py-1.5 text-xs font-semibold text-gold">
            <Flame size={14} aria-hidden />
            {today.streak} day{today.streak === 1 ? "" : "s"}
          </div>
        ) : null}
      </header>

      {!today ? (
        <div className="rounded-[20px] border border-dashed border-border-subtle bg-bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-secondary">No flashcards yet — check back soon.</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void reveal()}
          disabled={marking}
          className="w-full rounded-[24px] border border-border-subtle bg-bg-surface p-8 text-left shadow-sm transition hover:border-jade/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            {CATEGORY_LABELS[today.card.category] ?? today.card.category}
          </p>
          <p className="font-display text-xl font-medium leading-snug text-text-primary">{today.card.front}</p>
          {flipped ? (
            <div className="mt-5 border-t border-border-subtle pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-jade">{today.card.source}</p>
              {today.card.back ? <p className="mt-2 text-sm text-text-secondary">{today.card.back}</p> : null}
            </div>
          ) : (
            <p className="mt-5 text-xs text-text-muted">Tap to reveal source &amp; why it matters</p>
          )}
        </button>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-jade">Past 30 days</h2>
        {historyLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-jade" aria-label="Loading history" />
        ) : (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {history.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.card.front}`}
                className={`flex w-32 shrink-0 flex-col rounded-[14px] border p-3 text-xs ${
                  d.seen ? "border-jade/30 bg-jade/5" : "border-border-subtle bg-bg-surface"
                }`}
              >
                <span className="text-[10px] text-text-muted">{format(new Date(`${d.date}T00:00:00`), "d MMM")}</span>
                <span className="mt-1 line-clamp-3 text-text-secondary">{d.card.front}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
