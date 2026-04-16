export type TxnType = "CREDIT" | "DEBIT";

export type ParsedTransaction = {
  postedAt: Date;
  description: string;
  amount: number; // positive magnitude
  type: TxnType;
};

export type CategorizedTransaction = ParsedTransaction & {
  category: string;
  month: string; // YYYY-MM
};

export type AuditSummary = {
  month: string;
  totalInflow: number;
  totalOutflow: number;
  net: number;
  savingsRate: number | null;
  byCategory: { category: string; outflow: number; count: number }[];
};
