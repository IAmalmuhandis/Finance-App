"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, Plus, Edit2, Check, AlertCircle, Save, Trash2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { TrackerSkeleton } from "@/components/PageSkeletons";

interface Formula {
  stocks: number;
  emergency: number;
  obligations: number;
  food: number;
  flex: number;
}

interface CheckIn {
  date: string;
  score: string;
  answers: boolean[];
}

interface LogEntry {
  id: string;
  month: string;
  income: number;
  stocks: number;
  emergency: number;
  notes: string;
}

const DEFAULT_FORMULA: Formula = {
  stocks: 20,
  emergency: 10,
  obligations: 30,
  food: 25,
  flex: 15,
};

const CHECK_IN_QUESTIONS = [
  "Did I invest my stock allocation this week?",
  "Did I move money to my emergency fund?",
  "Did I stay within my obligations budget?",
  "Did I stay within my food budget?",
  "Did I avoid overspending my flex budget?",
  "Did I log this month's investment amount?",
];

export default function TrackerPage() {
  const [income, setIncome] = useState<number>(0);
  const [formula, setFormula] = useState<Formula>(DEFAULT_FORMULA);
  const [editingFormula, setEditingFormula] = useState<Formula>(DEFAULT_FORMULA);
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [currentCheckin, setCurrentCheckin] = useState<boolean[]>(new Array(6).fill(false));
  const [monthlyLog, setMonthlyLog] = useState<LogEntry[]>([]);
  const [newEntry, setNewEntry] = useState<Partial<LogEntry>>({
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    income: 0,
    stocks: 0,
    emergency: 0,
    notes: ""
  });
  const [syncNote, setSyncNote] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const initialSyncDone = useRef(false);
  const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistLocal = (inc: number, f: Formula, c: CheckIn[], log: LogEntry[]) => {
    localStorage.setItem("financeIncome", inc.toString());
    localStorage.setItem("financeFormula", JSON.stringify(f));
    localStorage.setItem("weeklyCheckins", JSON.stringify(c));
    localStorage.setItem("monthlyLog", JSON.stringify(log));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      initialSyncDone.current = false;
      const savedIncome = localStorage.getItem("financeIncome");
      const savedFormula = localStorage.getItem("financeFormula");
      const savedCheckins = localStorage.getItem("weeklyCheckins");
      const savedLog = localStorage.getItem("monthlyLog");

      let localIncome = savedIncome ? Number(savedIncome) : 0;
      let localFormula: Formula = { ...DEFAULT_FORMULA };
      if (savedFormula) {
        try {
          localFormula = { ...DEFAULT_FORMULA, ...JSON.parse(savedFormula) };
        } catch { /* ignore */ }
      }
      let localCheckins: CheckIn[] = [];
      if (savedCheckins) {
        try {
          localCheckins = JSON.parse(savedCheckins);
        } catch { /* ignore */ }
      }
      let localLog: LogEntry[] = [];
      if (savedLog) {
        try {
          localLog = JSON.parse(savedLog);
        } catch { /* ignore */ }
      }

      const localHasData =
        localIncome > 0 ||
        localCheckins.length > 0 ||
        localLog.length > 0 ||
        JSON.stringify(localFormula) !== JSON.stringify(DEFAULT_FORMULA);

      try {
        const r = await fetch("/api/tracker", { credentials: "include" });
        if (r.ok && !cancelled) {
          const data = (await r.json()) as {
            income: number;
            formula: Formula;
            checkins: CheckIn[];
            monthlyLog: LogEntry[];
            persisted?: boolean;
          };
          if (data.persisted === false && localHasData) {
            setIncome(localIncome);
            setFormula(localFormula);
            setEditingFormula(localFormula);
            setCheckins(localCheckins);
            setMonthlyLog(localLog);
            persistLocal(localIncome, localFormula, localCheckins, localLog);
            await fetch("/api/tracker", {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                income: localIncome,
                formula: localFormula,
                checkins: localCheckins,
                monthlyLog: localLog,
              }),
            });
            if (!cancelled) setSyncNote("Moved device data to your account");
          } else {
            const f = { ...DEFAULT_FORMULA, ...data.formula };
            const inc = data.income ?? 0;
            const chk = data.checkins ?? [];
            const log = data.monthlyLog ?? [];
            setIncome(inc);
            setFormula(f);
            setEditingFormula(f);
            setCheckins(chk);
            setMonthlyLog(log);
            persistLocal(inc, f, chk, log);
            if (!cancelled) setSyncNote("Loaded from your account");
          }
        } else if (!cancelled) {
          setIncome(localIncome);
          setFormula(localFormula);
          setEditingFormula(localFormula);
          setCheckins(localCheckins);
          setMonthlyLog(localLog);
          setSyncNote("Using data saved in this browser");
        }
      } catch {
        if (!cancelled) {
          setIncome(localIncome);
          setFormula(localFormula);
          setEditingFormula(localFormula);
          setCheckins(localCheckins);
          setMonthlyLog(localLog);
          setSyncNote("Using data saved in this browser");
        }
      } finally {
        if (!cancelled) {
          initialSyncDone.current = true;
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialSyncDone.current) return;
    localStorage.setItem("financeIncome", income.toString());
  }, [income]);

  useEffect(() => {
    if (!initialSyncDone.current) return;
    const run = () => {
      void fetch("/api/tracker", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ income, formula, checkins, monthlyLog }),
      })
        .then((r) => {
          if (r.ok) setSyncNote("Saved to your account");
        })
        .catch(() => setSyncNote("Could not sync; changes kept in this browser only"));
    };
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(run, 1200);
    return () => {
      if (cloudTimer.current) clearTimeout(cloudTimer.current);
    };
  }, [income, formula, checkins, monthlyLog]);

  const saveFormula = (newFormula: Formula) => {
    localStorage.setItem("financeFormula", JSON.stringify(newFormula));
    setFormula(newFormula);
    setIsEditingFormula(false);
  };

  const saveCheckin = () => {
    const score = currentCheckin.filter(Boolean).length;
    const newCheckin: CheckIn = {
      date: new Date().toLocaleDateString(),
      score: `${score}/6`,
      answers: [...currentCheckin]
    };
    const updated = [newCheckin, ...checkins];
    setCheckins(updated);
    localStorage.setItem("weeklyCheckins", JSON.stringify(updated));
    setCurrentCheckin(new Array(6).fill(false));
  };

  const addLogEntry = () => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      month: newEntry.month || "",
      income: newEntry.income || 0,
      stocks: newEntry.stocks || 0,
      emergency: newEntry.emergency || 0,
      notes: newEntry.notes || ""
    };
    const updated = [entry, ...monthlyLog];
    setMonthlyLog(updated);
    localStorage.setItem("monthlyLog", JSON.stringify(updated));
    setNewEntry({
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      income: 0,
      stocks: 0,
      emergency: 0,
      notes: ""
    });
  };

  const deleteLogEntry = (id: string) => {
    const updated = monthlyLog.filter(e => e.id !== id);
    setMonthlyLog(updated);
    localStorage.setItem("monthlyLog", JSON.stringify(updated));
  };

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount).replace("NGN", "₦");
  };

  const formulaSum = Object.values(editingFormula).reduce((a, b) => a + b, 0);
  const isValidFormula = formulaSum === 100;

  const allocations = [
    { label: "Stocks", percent: formula.stocks, color: "bg-accent-blue" },
    { label: "Emergency Fund", percent: formula.emergency, color: "bg-accent-green" },
    { label: "Obligations", percent: formula.obligations, color: "bg-accent-amber" },
    { label: "Food", percent: formula.food, color: "bg-accent-red" },
    { label: "Flex", percent: formula.flex, color: "bg-text-secondary" },
  ];

  const ytdStocks = monthlyLog.reduce((acc, curr) => acc + curr.stocks, 0);

  if (!hydrated) return <TrackerSkeleton />;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      <TopBar title="Track & formula" />
      <header className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-accent-blue">
            <TrendingUp size={24} />
            <h1 className="text-2xl font-bold text-text-primary">{"Track & formula"}</h1>
          </div>
          <div className="text-sm text-text-secondary bg-bg-surface px-3 py-1.5 rounded-full border border-border-subtle">
            {formula.stocks}-{formula.emergency}-{formula.obligations}-{formula.food}-{formula.flex}
          </div>
        </div>
        {syncNote ? <p className="text-sm text-accent-green/90">{syncNote}</p> : null}
      </header>

      {/* 1. FORMULA CALCULATOR */}
      <section className="bg-bg-surface rounded-xl border border-border-subtle p-6 space-y-6">
        <h2 className="text-lg font-semibold text-text-primary">--- 1. FORMULA CALCULATOR ---</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Income Input (₦)</label>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full md:w-64 bg-bg-input border border-border-subtle rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue transition"
                placeholder="Enter monthly income"
              />
              <input
                type="range"
                min="0"
                max="2000000"
                step="10000"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="flex-1 h-2 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {allocations.map((item) => (
              <div key={item.label} className="bg-bg-elevated p-4 rounded-lg border border-border-subtle space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary">{item.label}</span>
                  <span className="text-xs font-bold text-text-primary">{item.percent}%</span>
                </div>
                <div className="text-lg font-bold text-text-primary">
                  {formatNaira((income * item.percent) / 100)}
                </div>
                <div className="w-full h-1 bg-bg-input rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. FORMULA EDITOR */}
      <section className="bg-bg-surface rounded-xl border border-border-subtle p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text-primary">--- 2. FORMULA EDITOR ---</h2>
          {!isEditingFormula ? (
            <button
              onClick={() => setIsEditingFormula(true)}
              className="flex items-center gap-2 text-sm text-accent-blue hover:underline"
            >
              <Edit2 size={16} /> Edit Formula
            </button>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setEditingFormula(formula);
                  setIsEditingFormula(false);
                }}
                className="text-sm text-text-secondary hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={() => saveFormula(editingFormula)}
                disabled={!isValidFormula}
                className="flex items-center gap-2 text-sm text-accent-green hover:underline disabled:opacity-50 disabled:no-underline"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          )}
        </div>

        {isEditingFormula ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Object.keys(editingFormula).map((key) => (
                <div key={key} className="space-y-2">
                  <label className="text-xs text-text-secondary capitalize">{key} (%)</label>
                  <input
                    type="number"
                    value={editingFormula[key as keyof Formula]}
                    onChange={(e) =>
                      setEditingFormula({
                        ...editingFormula,
                        [key]: Number(e.target.value),
                      })
                    }
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
              ))}
            </div>
            {!isValidFormula && (
              <div className="flex items-center gap-2 text-accent-red text-sm bg-accent-red/10 p-3 rounded-lg border border-accent-red/20">
                <AlertCircle size={16} />
                Warning: Total must equal 100%. Current total: {formulaSum}%
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-text-secondary">
            Custom formula is set to <span className="text-text-primary font-medium">{formula.stocks}% Stocks, {formula.emergency}% Emergency, {formula.obligations}% Obligations, {formula.food}% Food, {formula.flex}% Flex</span>.
          </div>
        )}
      </section>

      {/* 3. WEEKLY CHECK-IN TAB */}
      <section className="bg-bg-surface rounded-xl border border-border-subtle p-6 space-y-6">
        <h2 className="text-lg font-semibold text-text-primary">--- 3. WEEKLY CHECK-IN TAB ---</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-secondary uppercase">Weekly Questions</h3>
            <div className="space-y-3">
              {CHECK_IN_QUESTIONS.map((q, idx) => (
                <label key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-bg-input hover:bg-bg-elevated transition cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={currentCheckin[idx]}
                      onChange={(e) => {
                        const next = [...currentCheckin];
                        next[idx] = e.target.checked;
                        setCurrentCheckin(next);
                      }}
                      className="w-5 h-5 appearance-none border-2 border-border-strong rounded bg-bg-app checked:bg-accent-blue checked:border-accent-blue transition"
                    />
                    {currentCheckin[idx] && <Check size={14} className="absolute left-0.5 text-white pointer-events-none" />}
                  </div>
                  <span className="text-sm text-text-primary group-hover:text-white transition">{q}</span>
                </label>
              ))}
            </div>
            <button
              onClick={saveCheckin}
              className="w-full bg-accent-blue hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition"
            >
              Submit Check-in
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-secondary uppercase">History Log</h3>
            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-border-strong">
              {checkins.length === 0 ? (
                <div className="text-sm text-text-muted italic py-4">No check-ins yet.</div>
              ) : (
                checkins.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-bg-elevated border border-border-subtle">
                    <span className="text-sm text-text-primary font-medium">{item.date}</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                      parseInt(item.score) >= 5 ? 'bg-accent-green/20 text-accent-green' : 
                      parseInt(item.score) >= 3 ? 'bg-accent-amber/20 text-accent-amber' : 
                      'bg-accent-red/20 text-accent-red'
                    }`}>
                      Score: {item.score}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. MONTHLY INVESTMENT LOG */}
      <section className="bg-bg-surface rounded-xl border border-border-subtle p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text-primary">--- 4. MONTHLY INVESTMENT LOG ---</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">Month</th>
                <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">Income (₦)</th>
                <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">Stocks (₦)</th>
                <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">Emergency (₦)</th>
                <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase">Notes</th>
                <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {monthlyLog.map((entry) => (
                <tr key={entry.id} className="hover:bg-bg-elevated transition">
                  <td className="py-3 px-4 text-sm text-text-primary">{entry.month}</td>
                  <td className="py-3 px-4 text-sm text-text-primary">{formatNaira(entry.income)}</td>
                  <td className="py-3 px-4 text-sm text-accent-blue font-medium">{formatNaira(entry.stocks)}</td>
                  <td className="py-3 px-4 text-sm text-accent-green font-medium">{formatNaira(entry.emergency)}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary max-w-[200px] truncate">{entry.notes}</td>
                  <td className="py-3 px-4 text-sm text-right">
                    <button onClick={() => deleteLogEntry(entry.id)} className="text-text-muted hover:text-accent-red transition">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-bg-input">
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={newEntry.month}
                    onChange={(e) => setNewEntry({...newEntry, month: e.target.value})}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-text-primary"
                    placeholder="Month"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    value={newEntry.income}
                    onChange={(e) => setNewEntry({...newEntry, income: Number(e.target.value)})}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-text-primary"
                    placeholder="0"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    value={newEntry.stocks}
                    onChange={(e) => setNewEntry({...newEntry, stocks: Number(e.target.value)})}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-text-primary"
                    placeholder="0"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    value={newEntry.emergency}
                    onChange={(e) => setNewEntry({...newEntry, emergency: Number(e.target.value)})}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-text-primary"
                    placeholder="0"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-text-primary"
                    placeholder="Notes..."
                  />
                </td>
                <td className="py-3 px-4 text-right">
                  <button onClick={addLogEntry} className="bg-accent-blue hover:bg-blue-600 text-white p-1.5 rounded-lg transition">
                    <Plus size={16} />
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-strong">
                <td colSpan={2} className="py-4 px-4 text-sm font-bold text-text-primary">YTD Stocks Invested:</td>
                <td className="py-4 px-4 text-lg font-bold text-accent-blue">{formatNaira(ytdStocks)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
