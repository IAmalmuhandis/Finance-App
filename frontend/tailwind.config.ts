import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-app": "#080D1A",
        "bg-surface": "#0F1624",
        "bg-elevated": "#182033",
        "bg-input": "#0D1220",
        "border-subtle": "#1E2D45",
        "border-strong": "#2A3F5F",
        "accent-blue": "#3B82F6",
        "accent-green": "#10B981",
        "accent-red": "#EF4444",
        "accent-amber": "#F59E0B",
        "text-primary": "#F1F5F9",
        "text-secondary": "#94A3B8",
        "text-muted": "#475569",
      },
    },
  },
  plugins: [],
} satisfies Config;

