export type BucketType = "Keep" | "Spend" | "Give";
export const TIERS = ["starter", "intermediate", "advance"] as const;
export type Tier = (typeof TIERS)[number];
export type CalculatorMode = Tier | "custom";

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

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Final Third's 4 children are always an equal quarter of Final Third's own value. */
const FINAL_QUARTER = 100 / 4;

function finalThirdChildren(): FormulaNode[] {
  return [
    { id: "family-mom", name: "Parent", relativePercent: FINAL_QUARTER, type: "Give" },
    { id: "spouse-marriage", name: "Spouse / Marriage", relativePercent: FINAL_QUARTER, type: "Give" },
    { id: "sadaqah-relatives", name: "Relative Family", relativePercent: FINAL_QUARTER, type: "Give" },
    { id: "emergency", name: "Emergency", relativePercent: FINAL_QUARTER, type: "Keep" },
  ];
}

function buildTierFormula(give: number, investment: number, personalConsumption: number, finalThird: number): FormulaNode[] {
  return [
    { id: "sadaqah-top", name: "Give", relativePercent: give, type: "Give" },
    { id: "investment", name: "Investment (Keep)", relativePercent: investment, type: "Keep" },
    { id: "personal-consumption", name: "Personal Consumption", relativePercent: personalConsumption, type: "Spend" },
    { id: "final-third", name: "Final Third", relativePercent: finalThird, children: finalThirdChildren() },
  ];
}

/** Starter — Give 15% / Keep 15% / Spend 70% overall. */
export function getStarterFormula(): FormulaNode[] {
  return buildTierFormula(6, 12, 70, 12);
}

/** Intermediate — Give 20% / Keep 28% / Spend 52% overall. */
export function getIntermediateFormula(): FormulaNode[] {
  return buildTierFormula(8, 24, 52, 16);
}

/** Advance — the original formula's exact percentages, re-split 4 ways instead of 3. */
export function getAdvanceFormula(): FormulaNode[] {
  const GIVE_TOP = 20 / 3; // ~6.667%
  const REMAINDER_THIRD = 280 / 9; // ~31.111%
  return buildTierFormula(GIVE_TOP, REMAINDER_THIRD, REMAINDER_THIRD, REMAINDER_THIRD);
}

export function getFormulaForTier(tier: Tier): FormulaNode[] {
  if (tier === "starter") return getStarterFormula();
  if (tier === "intermediate") return getIntermediateFormula();
  return getAdvanceFormula();
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

export function validateTree(nodes: FormulaNode[]): boolean {
  if (!isSiblingsValid(nodes)) return false;
  for (const n of nodes) {
    if (n.children?.length && !validateTree(n.children)) return false;
  }
  return true;
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
export const STORAGE_MODE = "arzo-calculator-mode";
