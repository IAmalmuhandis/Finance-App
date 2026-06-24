import type { Config } from "tailwindcss";

/** Legacy extend — primary tokens live in `src/app/globals.css` @theme inline. */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-app": "#F6F4EE",
        "bg-surface": "#FFFFFF",
        jade: "#0C4A3E",
        "jade-deep": "#082E27",
        gold: "#C9A24B",
        "gold-soft": "#EADFBE",
        "border-subtle": "#E6E1D5",
        "text-primary": "#11201B",
        "text-secondary": "#5B6B64",
        "text-muted": "#5B6B64",
        "text-on-jade": "#F6F4EE",
      },
    },
  },
  plugins: [],
} satisfies Config;
