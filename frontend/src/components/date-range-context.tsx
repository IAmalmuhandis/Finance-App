"use client";
import { createContext, useContext, useMemo, useState } from "react";

export type DateRange = "thisMonth" | "lastMonth" | "last3months" | "last6months" | "thisYear" | "allTime";

type Ctx = { dateRange: DateRange; setDateRange: (v: DateRange) => void };
const DateRangeContext = createContext<Ctx | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>("thisMonth");
  const value = useMemo(() => ({ dateRange, setDateRange }), [dateRange]);
  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}

