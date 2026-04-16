"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@financeos.local");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (isRegister) {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!r.ok) {
        const j = await r.json();
        setError(j.error || "Registration failed");
        return;
      }
    }
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) return setError("Invalid credentials");
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Finance OS</h1>
        <p className="mb-4 mt-1 text-sm text-text-secondary">AI-powered personal financial intelligence.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          {isRegister && (
            <input className="w-full rounded border border-border-subtle bg-bg-input p-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input className="w-full rounded border border-border-subtle bg-bg-input p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded border border-border-subtle bg-bg-input p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full">
            {isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>
        <button className="mt-3 text-sm text-text-secondary underline" onClick={() => setIsRegister((v) => !v)}>
          {isRegister ? "Have an account? Sign in" : "New user? Register"}
        </button>
      </div>
    </div>
  );
}
