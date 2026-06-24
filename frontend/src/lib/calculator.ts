export type BucketType = "Keep" | "Spend" | "Give";
export type CalculatorMode = "recommended" | "custom";

export interface FormulaNode {
  id: string;
  name: string;
  relativePercent: number;
  type?: BucketType;
  children?: FormulaNode[];
}

export interface LeafInfo {
  id: string;
  name: string;
  type: BucketType;
  relativePercent: number;
  effectivePercent: number;
}

export interface Allocation {
  name: string;
  type: BucketType;
  amount: number;
}

const THIRD = 100 / 3;

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getRecommendedFormula(): FormulaNode[] {
  return [
    { id: "investment", name: "Investment", relativePercent: THIRD, type: "Keep" },
    { id: "personal-needs", name: "Personal needs", relativePercent: THIRD, type: "Spend" },
    {
      id: "final-third",
      name: "Final third",
      relativePercent: THIRD,
      children: [
        { id: "family", name: "Family", relativePercent: THIRD, type: "Give" },
        { id: "sadaqah", name: "Sadaqah", relativePercent: THIRD, type: "Give" },
        { id: "emergency", name: "Emergency", relativePercent: THIRD, type: "Keep" },
      ],
    },
  ];
}

export function getDefaultCustomFormula(): FormulaNode[] {
  return [{ id: newId(), name: "All income", relativePercent: 100, type: "Keep" }];
}

export function siblingsSum(nodes: FormulaNode[]): number {
  return nodes.reduce((s, n) => s + n.relativePercent, 0);
}

export function siblingsDelta(nodes: FormulaNode[]): number {
  return Math.round((siblingsSum(nodes) - 100) * 100) / 100;
}

export function isSiblingsValid(nodes: FormulaNode[]): boolean {
  return Math.abs(siblingsDelta(nodes)) < 0.01;
}

export function collectLeaves(nodes: FormulaNode[], parentEffective = 100): LeafInfo[] {
  const out: LeafInfo[] = [];
  for (const node of nodes) {
    const effective = (parentEffective * node.relativePercent) / 100;
    if (node.children && node.children.length > 0) {
      out.push(...collectLeaves(node.children, effective));
    } else {
      out.push({
        id: node.id,
        name: node.name,
        type: node.type ?? "Keep",
        relativePercent: node.relativePercent,
        effectivePercent: effective,
      });
    }
  }
  return out;
}

export function computeAllocations(gross: number, formula: FormulaNode[]): Allocation[] {
  const leaves = collectLeaves(formula);
  if (gross <= 0 || leaves.length === 0) {
    return leaves.map((l) => ({ name: l.name, type: l.type, amount: 0 }));
  }

  const withRaw = leaves.map((l) => ({
    ...l,
    raw: (gross * l.effectivePercent) / 100,
  }));

  const rounded = withRaw.map((l) => ({
    ...l,
    amount: Math.round(l.raw),
  }));

  const sum = rounded.reduce((s, l) => s + l.amount, 0);
  const diff = gross - sum;
  if (diff !== 0 && rounded.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < rounded.length; i++) {
      if (rounded[i].amount > rounded[maxIdx].amount) maxIdx = i;
      else if (rounded[i].amount === rounded[maxIdx].amount && rounded[i].raw > rounded[maxIdx].raw) maxIdx = i;
    }
    rounded[maxIdx].amount += diff;
  }

  return rounded.map(({ name, type, amount }) => ({ name, type, amount }));
}

export function parseNairaInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
}

export function formatNairaInput(value: string): string {
  const n = parseNairaInput(value);
  if (n === 0) return "";
  return n.toLocaleString("en-NG");
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export const STORAGE_INCOME = "arzo-last-income";
export const STORAGE_CUSTOM_FORMULA = "arzo-custom-formula";
