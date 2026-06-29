export interface ProjectionInput {
  initialCapital: number;
  incomeRate: number;           // % per transaction
  consumptionRate: number;      // % of capital consumed per transaction
  additionalCapitalRate: number; // % of capital added externally per transaction
  numTransactions: number;
  targetWealth?: number;        // optional goal
}

export interface TransactionRow {
  no: number;
  initialCapital: number;
  additionalCapital: number;
  income: number;
  consumption: number;
  newCapital: number;
}

export interface ProjectionSummary {
  finalCapital: number;
  totalIncome: number;
  totalConsumption: number;
  totalAdditional: number;
  netGrowthPct: number;
  targetReachedAt: number | null; // transaction number when targetWealth first reached
  isGrowing: boolean;
}

export function computeProjection(
  input: ProjectionInput
): { rows: TransactionRow[]; summary: ProjectionSummary } {
  const {
    initialCapital,
    incomeRate,
    consumptionRate,
    additionalCapitalRate,
    numTransactions,
    targetWealth,
  } = input;

  const rows: TransactionRow[] = [];
  let capital = initialCapital;
  let totalIncome = 0;
  let totalConsumption = 0;
  let totalAdditional = 0;
  let targetReachedAt: number | null = null;

  for (let i = 1; i <= numTransactions; i++) {
    const additionalCapital = (additionalCapitalRate / 100) * capital;
    const income = (incomeRate / 100) * capital;
    const consumption = (consumptionRate / 100) * capital;
    const newCapital = capital + additionalCapital + income - consumption;

    totalIncome += income;
    totalConsumption += consumption;
    totalAdditional += additionalCapital;

    rows.push({
      no: i,
      initialCapital: capital,
      additionalCapital,
      income,
      consumption,
      newCapital,
    });

    capital = newCapital;

    if (targetReachedAt === null && targetWealth !== undefined && capital >= targetWealth) {
      targetReachedAt = i;
    }
  }

  const netGrowthPct =
    initialCapital > 0
      ? ((capital - initialCapital) / initialCapital) * 100
      : 0;

  const isGrowing = incomeRate + additionalCapitalRate > consumptionRate;

  return {
    rows,
    summary: {
      finalCapital: capital,
      totalIncome,
      totalConsumption,
      totalAdditional,
      netGrowthPct,
      targetReachedAt,
      isGrowing,
    },
  };
}
