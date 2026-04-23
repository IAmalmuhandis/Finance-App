/**
 * Rule-based financial audit metrics (runs before/alongside LLM) for report generation.
 */

type Txn = {
  amount: number;
  type: string;
  category?: string;
  date: string;
  month: string;
  description: string;
};

export type FinancialAudit = {
  healthScore: number;
  healthLabel: "strong" | "ok" | "caution" | "concern";
  metrics: {
    totalIncome: number;
    totalExpenses: number;
    netPosition: number;
    savingsRatePct: number;
    expenseToIncomeRatio: number;
    avgDailySpend: number;
    uniqueMonths: number;
    topCategory: string;
    topCategoryConcentrationPct: number;
    largestDebitPctOfExpenses: number;
    incomeVolatilityPct: number;
    monthNetVolatility: number;
  };
  flags: { level: "info" | "warning" | "critical"; code: string; message: string }[];
  summaryBullets: string[];
};

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

export function computeFinancialAudit(txns: Txn[], financial: {
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  savingsRate: number;
  topCategory: string;
  categoryBreakdown: { category: string; amount: number; count: number }[];
  monthlyTrends: { month: string; income: number; expenses: number }[];
}): FinancialAudit {
  const totalIncome = financial.totalIncome;
  const totalExpenses = financial.totalExpenses;
  const net = financial.netPosition;
  const savingsRatePct = totalIncome > 0 ? (net / totalIncome) * 100 : 0;
  const expenseToIncomeRatio = totalIncome > 0 ? totalExpenses / totalIncome : totalExpenses > 0 ? Infinity : 0;

  const days = new Set<string>();
  for (const t of txns) {
    if (t.type === "DEBIT" && t.date) days.add(t.date);
  }
  const dayCount = Math.max(1, days.size);
  const avgDailySpend = totalExpenses / dayCount;

  const topCat = financial.categoryBreakdown[0];
  const topCategoryConcentrationPct =
    totalExpenses > 0 && topCat ? (topCat.amount / totalExpenses) * 100 : 0;

  const debits = txns.filter((t) => t.type === "DEBIT").map((t) => t.amount);
  const maxDebit = debits.length ? Math.max(...debits) : 0;
  const largestDebitPctOfExpenses = totalExpenses > 0 ? (maxDebit / totalExpenses) * 100 : 0;

  const byMonth: Record<string, { in: number; ex: number }> = {};
  for (const t of txns) {
    if (!t.month) continue;
    if (!byMonth[t.month]) byMonth[t.month] = { in: 0, ex: 0 };
    if (t.type === "CREDIT") byMonth[t.month].in += t.amount;
    if (t.type === "DEBIT") byMonth[t.month].ex += t.amount;
  }
  const months = Object.keys(byMonth).sort();
  const monthNets = months.map((m) => byMonth[m]!.in - byMonth[m]!.ex);
  const monthIncomes = months.map((m) => byMonth[m]!.in);
  const monthNetVolatility = stdev(monthNets);
  const incomeVolatilityPct = stdev(monthIncomes) > 0 && totalIncome / months.length > 0
    ? (stdev(monthIncomes) / (totalIncome / months.length)) * 100
    : 0;

  const flags: FinancialAudit["flags"] = [];
  if (txns.length === 0) {
    flags.push({ level: "warning", code: "NO_DATA", message: "No transactions in scope — add uploads or pick a different month/accounts." });
  }
  if (net < 0) {
    flags.push({ level: "critical", code: "NEGATIVE_NET", message: "Total outflows exceed inflows in this period (negative net)." });
  }
  if (savingsRatePct < 0 && totalIncome > 0) {
    flags.push({ level: "warning", code: "NEGATIVE_SAVINGS_RATE", message: "Savings rate is negative — spending more than you earn on average." });
  }
  if (expenseToIncomeRatio > 1.2 && totalIncome > 0) {
    flags.push({ level: "warning", code: "HIGH_BURN", message: "Expenses are well above 100% of reported income in this set." });
  }
  if (largestDebitPctOfExpenses > 35) {
    flags.push({ level: "warning", code: "LARGE_TXN", message: "A single outflow is a large share of total expenses (concentration risk)." });
  }
  if (topCategoryConcentrationPct > 50 && totalExpenses > 0) {
    flags.push({ level: "info", code: "CATEGORY_CONC", message: "One category dominates spending — check if intentional." });
  }
  if (months.length >= 2 && monthNetVolatility > Math.abs((monthNets.reduce((a, b) => a + b, 0) / monthNets.length) * 0.5) && monthNets.some((n) => n < 0)) {
    flags.push({ level: "info", code: "VOLATILITY", message: "Net cash flow varies a lot between months (uneven seasonality or timing)." });
  }
  if (savingsRatePct > 0 && savingsRatePct < 10 && totalIncome > 0) {
    flags.push({ level: "info", code: "LOW_BUFFER", message: "Positive but low savings margin relative to income — small buffer to shocks." });
  }

  let healthScore = 50;
  if (txns.length) {
    healthScore = 55;
    if (net >= 0) healthScore += 15;
    if (savingsRatePct >= 10) healthScore += 10;
    if (savingsRatePct >= 25) healthScore += 10;
    if (largestDebitPctOfExpenses < 25) healthScore += 5;
    if (topCategoryConcentrationPct < 40) healthScore += 5;
    if (expenseToIncomeRatio > 1) healthScore -= 20;
    if (net < 0) healthScore -= 15;
    if (flags.some((f) => f.level === "critical")) healthScore -= 15;
    if (flags.filter((f) => f.level === "warning").length > 1) healthScore -= 5;
  }
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  let healthLabel: FinancialAudit["healthLabel"] = "ok";
  if (healthScore >= 80) healthLabel = "strong";
  else if (healthScore >= 60) healthLabel = "ok";
  else if (healthScore >= 40) healthLabel = "caution";
  else healthLabel = "concern";

  const summaryBullets: string[] = [];
  if (txns.length) {
    summaryBullets.push(
      `Over ${months.length || 1} month(s): inflows ≈ ${totalIncome.toFixed(0)}, outflows ≈ ${totalExpenses.toFixed(0)}, net ≈ ${net.toFixed(0)}.`
    );
    summaryBullets.push(`Savings margin (income-basis) ≈ ${savingsRatePct.toFixed(1)}%. Top spend category: ${financial.topCategory}.`);
    if (avgDailySpend) summaryBullets.push(`Implied average spend on days with outflows: ≈ ${avgDailySpend.toFixed(0)}.`);
  }

  return {
    healthScore,
    healthLabel,
    metrics: {
      totalIncome,
      totalExpenses,
      netPosition: net,
      savingsRatePct,
      expenseToIncomeRatio: Number.isFinite(expenseToIncomeRatio) ? expenseToIncomeRatio : 0,
      avgDailySpend,
      uniqueMonths: months.length,
      topCategory: financial.topCategory,
      topCategoryConcentrationPct,
      largestDebitPctOfExpenses,
      incomeVolatilityPct,
      monthNetVolatility,
    },
    flags,
    summaryBullets,
  };
}
