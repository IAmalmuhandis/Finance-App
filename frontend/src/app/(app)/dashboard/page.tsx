"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Tooltip, XAxis, YAxis, LineChart, Line, CartesianGrid, Cell } from "recharts";
import { AlertTriangle, Info, TrendingUp } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useDateRange } from "@/components/date-range-context";

const money = (v: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(v);

export default function DashboardPage() {
  const { dateRange } = useDateRange();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/dashboard?dateRange=${dateRange}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => toast.error("Failed to load dashboard"));
  }, [dateRange]);

  if (!data) return <div className="p-8"><div className="h-80 animate-pulse rounded-xl bg-bg-surface" /></div>;
  const s = data.stats;
  const p = data.prevStats;
  const delta = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : 0);

  return (
    <div className="p-8">
      <TopBar title="Dashboard" showDateFilter />
      <Link
        href="/tracker"
        className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-bg-surface p-4 transition hover:border-accent-blue/50 hover:bg-bg-elevated"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue/15 text-accent-blue">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Track &amp; formula</p>
            <p className="text-sm text-text-secondary">
              Income split calculator (e.g. 20-10-30-25-15), edit buckets, weekly check-ins, and monthly log — matches the mobile app.
            </p>
          </div>
        </div>
        <span className="text-sm font-medium text-accent-blue">Open</span>
      </Link>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Card title="Total Income" value={money(s.totalIncome)} delta={delta(s.totalIncome, p.totalIncome)} accent="border-accent-green" />
        <Card title="Total Spent" value={money(s.totalExpenses)} delta={delta(s.totalExpenses, p.totalExpenses)} accent="border-accent-red" />
        <Card title="Net Position" value={money(s.netPosition)} delta={delta(s.netPosition, p.netPosition)} accent="border-accent-blue" />
        <Card title="Savings Rate" value={`${s.savingsRate.toFixed(1)}%`} delta={delta(s.savingsRate, p.savingsRate)} accent="border-accent-amber" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel title="Income vs Expenses">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.monthlyChart}>
              <XAxis dataKey="month" stroke="#475569" />
              <YAxis stroke="#475569" />
              <Tooltip />
              <Bar dataKey="income" fill="#10B981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="#EF4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Category Breakdown">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.categoryChart} dataKey="amount" nameKey="category" outerRadius={85}>
                {data.categoryChart.map((_: any, i: number) => (
                  <Cell key={i} fill={["#2563eb", "#ea580c", "#9333ea", "#0891b2", "#65a30d", "#e11d48"][i % 6]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <div className="mt-4">
      <Panel title="Cash Flow Trend">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.monthlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
            <XAxis dataKey="month" stroke="#475569" />
            <YAxis stroke="#475569" />
            <Tooltip />
            <Line type="monotone" dataKey="income" stroke="#16a34a" />
            <Line type="monotone" dataKey="expenses" stroke="#dc2626" />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Panel title="Recent Transactions">
          <div className="space-y-2">
            {(data.recentTransactions || []).map((t: any) => (
              <div key={t._id} className="grid grid-cols-5 items-center gap-2 rounded-lg bg-bg-elevated p-2 text-xs">
                <span>{new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className="col-span-2 truncate">{t.description}</span>
                <span className="truncate rounded bg-bg-input px-2 py-0.5">{t.account?.nickname || "Account"}</span>
                <span className={t.type === "CREDIT" ? "text-accent-green text-right" : "text-accent-red text-right"}>
                  {t.type === "DEBIT" ? "-" : ""}{money(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      <Panel title="Insights & Alerts">
        <ul className="space-y-2">
          {(data.insights || []).map((i: any) => (
            <li key={i.id} className="rounded border bg-white p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {i.type === "warning" ? <AlertTriangle size={14} /> : i.type === "success" ? <TrendingUp size={14} /> : <Info size={14} />}
                {i.title}
              </div>
              <div className="text-text-secondary">{i.description || i.detail}</div>
            </li>
          ))}
        </ul>
      </Panel>
      </div>
    </div>
  );
}

function Card({ title, value, delta, accent }: { title: string; value: string; delta: number; accent: string }) {
  return (
    <div className={`rounded-xl border border-border-subtle border-l-4 bg-bg-surface p-5 ${accent}`}>
      <div className="text-xs uppercase tracking-wide text-text-muted">{title}</div>
      <div className="mt-2 text-3xl font-bold text-text-primary">{value}</div>
      <div className={`mt-3 text-xs ${delta >= 0 ? "text-accent-green" : "text-accent-red"}`}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs last period</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 xl:col-span-3"><h2 className="mb-2 text-sm font-medium text-text-secondary">{title}</h2>{children}</div>;
}
