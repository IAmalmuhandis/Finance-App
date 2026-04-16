"use client";
import { Bell } from "lucide-react";
import { useDateRange } from "./date-range-context";

export function TopBar({ title, showDateFilter = false }: { title: string; showDateFilter?: boolean }) {
  const { dateRange, setDateRange } = useDateRange();
  return (
    <div className="flex items-center justify-between border-b border-border-subtle px-8 py-6">
      <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
      <div className="flex items-center gap-3">
        {showDateFilter ? (
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-lg border border-border-subtle bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:border-border-strong"
          >
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="last3months">Last 3 Months</option>
            <option value="last6months">Last 6 Months</option>
            <option value="thisYear">This Year</option>
            <option value="allTime">All Time</option>
          </select>
        ) : null}
        <button className="rounded-lg border border-border-subtle bg-bg-input p-2 text-text-secondary hover:bg-bg-elevated">
          <Bell size={16} />
        </button>
      </div>
    </div>
  );
}

