"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/TopBar";
import { AccountsSkeleton } from "@/components/PageSkeletons";

const banks = ["GTBank", "Access Bank", "Zenith Bank", "First Bank", "UBA", "Opay", "Palmpay", "Kuda", "Sterling Bank", "Wema Bank", "Fidelity Bank", "Stanbic IBTC", "Polaris Bank", "Union Bank", "Ecobank"];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bankName: "", nickname: "", type: "PERSONAL", last4: "", currency: "NGN", color: "#3B82F6" });

  const load = async () => {
    try {
      const r = await fetch("/api/accounts");
      const j = await r.json();
      setAccounts(j.accounts || []);
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    const r = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!r.ok) return toast.error("Failed to add account");
    toast.success("Account added");
    setOpen(false);
    void load();
  };
  const del = async (id: string) => {
    const r = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Delete failed");
    toast.success("Account deleted");
    void load();
  };

  if (loading) return <AccountsSkeleton />;

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <TopBar title="My Accounts" />
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-sm text-white"><Plus size={16} />Add Account</button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-xl border border-border-subtle bg-bg-surface p-6" style={{ borderLeft: `4px solid ${a.color || "#3B82F6"}` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold">{a.bankName}</p>
                <p className="text-sm text-text-secondary">{a.nickname}</p>
              </div>
              <button onClick={() => del(a.id)} className="text-text-secondary hover:text-accent-red"><Trash2 size={16} /></button>
            </div>
            <div className="mt-2 text-xs text-text-muted">•••• {a.last4 || "----"}</div>
            <div className="my-4 border-t border-border-subtle" />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><p className="text-text-muted">Transactions</p><p className="font-bold">{a.transactionCount}</p></div>
              <div><p className="text-text-muted">Total In</p><p className="font-bold text-accent-green">{a.totalIn?.toLocaleString()}</p></div>
              <div><p className="text-text-muted">Total Out</p><p className="font-bold text-accent-red">{a.totalOut?.toLocaleString()}</p></div>
            </div>
            <p className="mt-3 text-xs text-text-muted">Last upload: {a.lastUploadAt ? new Date(a.lastUploadAt).toLocaleDateString() : "Never"}</p>
          </div>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="w-full max-w-xl rounded-xl border border-border-subtle bg-bg-surface p-6">
            <h3 className="mb-4 text-lg font-semibold">Add Account</h3>
            <input list="banks" placeholder="Bank Name" className="mb-2 w-full rounded-lg border border-border-subtle bg-bg-input p-2" onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            <datalist id="banks">{banks.map((b) => <option key={b} value={b} />)}</datalist>
            <input placeholder="Nickname" className="mb-2 w-full rounded-lg border border-border-subtle bg-bg-input p-2" onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            <div className="mb-2 flex gap-2">
              <button onClick={() => setForm({ ...form, type: "PERSONAL" })} className={`rounded-lg px-3 py-2 ${form.type === "PERSONAL" ? "bg-accent-blue" : "bg-bg-input"}`}>PERSONAL</button>
              <button onClick={() => setForm({ ...form, type: "BUSINESS" })} className={`rounded-lg px-3 py-2 ${form.type === "BUSINESS" ? "bg-accent-amber" : "bg-bg-input"}`}>BUSINESS</button>
            </div>
            <input maxLength={4} placeholder="Last 4 digits" className="mb-2 w-full rounded-lg border border-border-subtle bg-bg-input p-2" onChange={(e) => setForm({ ...form, last4: e.target.value })} />
            <select className="mb-2 w-full rounded-lg border border-border-subtle bg-bg-input p-2" onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {["NGN", "USD", "GBP", "EUR"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="mb-4 flex gap-2">{["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#A855F7", "#06B6D4"].map((c) => <button key={c} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} className="h-8 w-8 rounded-full border border-border-subtle" />)}</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-border-subtle px-4 py-2">Cancel</button>
              <button onClick={add} className="rounded-lg bg-accent-blue px-4 py-2">Add Account</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

