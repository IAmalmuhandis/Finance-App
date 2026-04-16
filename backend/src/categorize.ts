const rules: { category: string; patterns: RegExp[] }[] = [
  { category: "Food", patterns: [/STARBUCKS/i, /MCDONALD/i, /RESTAURANT/i, /CAFE/i, /WHOLE FOODS/i, /GROCERY/i] },
  { category: "Fuel", patterns: [/SHELL/i, /EXXON/i, /CHEVRON/i, /GAS/i, /FUEL/i] },
  { category: "Transfers", patterns: [/TRANSFER/i, /ZELLE/i, /VENMO/i, /CASH APP/i, /PAYPAL/i] },
  { category: "Subscriptions", patterns: [/NETFLIX/i, /SPOTIFY/i, /HULU/i, /APPLE\.COM\/BILL/i, /GOOGLE\*/i] },
  { category: "Business", patterns: [/INVOICE/i, /CLIENT/i, /STRIPE/i, /SQUARE/i, /ADWORDS/i] },
  { category: "Housing", patterns: [/RENT/i, /MORTGAGE/i, /LANDLORD/i, /PROPERTY/i] },
  { category: "Transport", patterns: [/UBER/i, /LYFT/i, /TRANSIT/i, /METRO/i, /TRAIN/i] },
  { category: "Shopping", patterns: [/AMAZON/i, /WALMART/i, /TARGET/i, /COSTCO/i] },
  { category: "Income", patterns: [/PAYROLL/i, /SALARY/i, /DIRECT DEP/i, /DEPOSIT/i] }
];

export function categorize(description: string, type: "CREDIT" | "DEBIT") {
  for (const r of rules) {
    if (r.patterns.some((p) => p.test(description))) return r.category;
  }
  if (type === "CREDIT") return "Income";
  return "Other";
}
