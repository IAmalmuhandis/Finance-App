"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArzoBrand } from "@/components/ArzoBrand";
import { PasswordInput } from "@/components/PasswordInput";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleAuth, setGoogleAuth] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/social-config")
      .then((r) => r.json())
      .then((d) => setGoogleAuth(Boolean(d.google)))
      .catch(() => setGoogleAuth(false));
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("error");
    if (q === "google_account") {
      setError("This email is already linked to a different Google account. Try another sign-in method.");
    } else if (q === "OAuthAccountNotLinked") {
      setError("This Google account is not linked yet. Sign in with email first, or use a matching Google account.");
    } else if (q === "AccessDenied") {
      setError("Google sign-in was cancelled or denied.");
    }
    if (q) router.replace("/", { scroll: false });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
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
      if (res?.error) {
        setError(isRegister ? "Account created but sign-in failed" : "Invalid email or password");
        return;
      }
      router.push("/calculator");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-[20px] border border-border-subtle bg-bg-surface p-6">
        {busy && !googleBusy ? (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[20px] bg-bg-app/90 px-6 backdrop-blur-[2px]"
            aria-busy="true"
            aria-live="polite"
          >
            <Loader2 className="h-10 w-10 animate-spin text-jade" strokeWidth={1.75} />
            <p className="mt-4 text-center text-sm font-medium text-text-primary">
              {isRegister ? "Creating your account…" : "Signing you in…"}
            </p>
          </div>
        ) : null}

        <ArzoBrand markSize={48} variant="hero" className="mb-6 gap-3" />
        <form onSubmit={onSubmit} className="space-y-3">
          {isRegister && (
            <input
              className="w-full rounded-[12px] border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-jade focus:ring-1 focus:ring-jade/30 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy || googleBusy}
            />
          )}
          <input
            className="w-full rounded-[12px] border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-jade focus:ring-1 focus:ring-jade/30 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy || googleBusy}
            required
          />
          <PasswordInput
            placeholder="Password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy || googleBusy}
            minLength={isRegister ? 6 : undefined}
            required
          />
          {error ? <p className="text-sm text-accent-red" role="alert">{error}</p> : null}
          <Button
            type="submit"
            disabled={busy || googleBusy}
            className="h-11 w-full rounded-[14px] bg-jade text-text-on-jade hover:bg-jade/90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        {googleAuth ? (
          <div className="mt-5">
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-x-0 top-1/2 h-px bg-border-subtle" aria-hidden />
              <span className="relative bg-bg-surface px-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                Or continue with
              </span>
            </div>
            <button
              type="button"
              disabled={busy || googleBusy}
              onClick={() => {
                setError("");
                setGoogleBusy(true);
                void signIn("google", { callbackUrl: "/calculator" }).catch(() => {
                  setGoogleBusy(false);
                  setError("Could not start Google sign-in.");
                });
              }}
              className="mt-3 flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border-subtle bg-bg-input text-sm font-medium text-text-primary transition hover:bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              {googleBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleMark />}
              Google
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="mt-3 text-sm text-text-secondary underline decoration-text-muted underline-offset-2 transition hover:text-text-primary"
          onClick={() => {
            setIsRegister((v) => !v);
            setError("");
          }}
          disabled={busy || googleBusy}
        >
          {isRegister ? "Have an account? Sign in" : "New user? Register"}
        </button>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
