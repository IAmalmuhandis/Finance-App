"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputClassName?: string;
};

export function PasswordInput({ className, inputClassName, disabled, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <input
        type={show ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
        disabled={disabled}
        className={cn(
          "w-full rounded-lg border border-border-subtle bg-bg-input py-2.5 pl-3 pr-11 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-border-strong focus:ring-1 focus:ring-accent-blue/35 disabled:cursor-not-allowed disabled:opacity-50",
          inputClassName
        )}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-text-muted transition hover:bg-bg-elevated hover:text-text-secondary disabled:pointer-events-none disabled:opacity-40"
        onClick={() => setShow((s) => !s)}
        disabled={disabled}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
      </button>
    </div>
  );
}
