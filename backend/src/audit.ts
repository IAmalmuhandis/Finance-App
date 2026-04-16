import type { AuditSummary, CategorizedTransaction } from "./types";

export function computeAudit(month: string, txns: CategorizedTransaction[]): AuditSummary {
  const inflow = txns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const outflow = txns.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
  const net = inflow - outflow;
  const savingsRate = inflow > 0 ? net / inflow : null;

  const by = new Map<string, { outflow: number; count: number }>();
  for (const t of txns) {
    if (t.type !== "DEBIT") continue;
    const cur = by.get(t.category) ?? { outflow: 0, count: 0 };
    cur.outflow += t.amount;
    cur.count += 1;
    by.set(t.category, cur);
  }

  const byCategory = [...by.entries()]
    .map(([category, v]) => ({ category, outflow: round2(v.outflow), count: v.count }))
    .sort((a, b) => b.outflow - a.outflow);

  return {
    month,
    totalInflow: round2(inflow),
    totalOutflow: round2(outflow),
    net: round2(net),
    savingsRate: savingsRate == null ? null : round4(savingsRate),
    byCategory,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

