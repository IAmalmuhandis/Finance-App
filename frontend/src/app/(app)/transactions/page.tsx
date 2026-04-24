"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useDateRange } from "@/components/date-range-context";
import { toast } from "sonner";
import { TransactionsSkeleton } from "@/components/PageSkeletons";

export default function TransactionsPage() {
  const { dateRange } = useDateRange();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<any>({});
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState<any>({ totalPages: 1, total: 0 });
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch(`/api/transactions?page=${page}&search=${encodeURIComponent(search)}`);
    const j = await r.json();
    if (!r.ok) {
      toast.error("Failed to load transactions");
      setInitialLoad(false);
      return;
    }
    setRows(j.transactions || []);
    setSummary(j.summary || {});
    setMeta({ totalPages: j.totalPages || 1, total: j.total || 0 });
    setInitialLoad(false);
  }, [page, search]);
  useEffect(() => {
    void load();
  }, [load, dateRange]);

  if (initialLoad) return <TransactionsSkeleton />;

  return (
    <div className="p-8">
      <TopBar title="Transactions" showDateFilter />
      <div className="sticky top-0 mt-4 flex items-center gap-2 border-b border-border-subtle bg-bg-app py-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 text-text-muted" size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-border-subtle bg-bg-input py-2 pl-7 pr-3 text-sm" placeholder="Search description" />
        </div>
        <button onClick={() => window.open("/api/transactions/export", "_blank")} className="ml-auto flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-2 text-sm"><Download size={14} />Export CSV</button>
      </div>
      <div className="my-3 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-sm">
        {meta.total} transactions | <span className="text-accent-green">Income: ₦{(summary.totalCredit || 0).toLocaleString()}</span> | <span className="text-accent-red">Expenses: ₦{(summary.totalDebit || 0).toLocaleString()}</span> | Net: ₦{(summary.net || 0).toLocaleString()}
      </div>
      <div className="overflow-hidden rounded-xl border border-border-subtle">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Account</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Amount</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((t, i) => (
              <tr key={t._id} className={i % 2 ? "bg-bg-elevated" : "bg-bg-surface"}>
                <td className="p-3">{new Date(t.date).toLocaleDateString()}</td>
                <td className="p-3">{t.description}</td>
                <td className="p-3">{t.accountId?.nickname || "-"}</td>
                <td className="p-3">
                  <select
                    value={t.category}
                    onChange={async (e) => {
                      await fetch(`/api/transactions/${t._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: e.target.value }) });
                      load();
                    }}
                    className="rounded border border-border-subtle bg-bg-input px-2 py-1"
                  >
                    {["Food & Dining", "Transfers", "Subscriptions", "Fuel & Transport", "Bills & Utilities", "Shopping", "Business", "Cash & ATM", "Giving", "Health", "Other"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td className="p-3">{t.type}</td>
                <td className={`p-3 text-right ${t.type === "CREDIT" ? "text-accent-green" : "text-accent-red"}`}>{t.type === "DEBIT" ? "-" : ""}₦{t.amount.toLocaleString()}</td>
              </tr>
            )) : <tr><td colSpan={6} className="p-8 text-center text-text-secondary">No transactions found. Upload a bank statement to get started.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-border-subtle px-3 py-1">Prev</button>
        <span className="text-sm">{page} / {meta.totalPages}</span>
        <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} className="rounded border border-border-subtle px-3 py-1">Next</button>
      </div>
    </div>
  );
}

