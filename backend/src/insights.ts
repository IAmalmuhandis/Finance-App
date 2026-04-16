import type { CategorizedTransaction } from "./types";

export type Insight = { id: string; severity: "info" | "warn"; title: string; detail: string };

export function generateInsights(txns: CategorizedTransaction[], now = new Date()): Insight[] {
  const insights: Insight[] = [];

  const last7Start = new Date(now);
  last7Start.setDate(now.getDate() - 7);
  const prev7Start = new Date(now);
  prev7Start.setDate(now.getDate() - 14);

  const last7 = txns.filter((t) => t.type === "DEBIT" && t.postedAt >= last7Start);
  const prev7 = txns.filter((t) => t.type === "DEBIT" && t.postedAt >= prev7Start && t.postedAt < last7Start);

  const sLast = sum(last7);
  const sPrev = sum(prev7);
  if (sPrev > 0) {
    const change = (sLast - sPrev) / sPrev;
    if (change > 0.25) {
      insights.push({
        id: "spend_spike",
        severity: "warn",
        title: "Spending spike this week",
        detail: `You spent ${pct(change)} more in the last 7 days vs the prior 7 days.`,
      });
    }
  }

  const small = last7.filter((t) => t.amount > 0 && t.amount <= 10);
  if (small.length >= 8) {
    insights.push({
      id: "small_freq",
      severity: "info",
      title: "Frequent small expenses",
      detail: `You had ${small.length} purchases under $10 in the last 7 days. These can add up.`,
    });
  }

  const transfers = last7.filter((t) => /Transfers/i.test(t.category));
  if (transfers.length >= 3) {
    insights.push({
      id: "transfer_freq",
      severity: "info",
      title: "Many transfers recently",
      detail: "You’ve made multiple transfers in the last week. Ensure these aren’t masking overspending.",
    });
  }

  return insights;
}

function sum(txns: CategorizedTransaction[]) {
  return txns.reduce((s, t) => s + t.amount, 0);
}
function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

