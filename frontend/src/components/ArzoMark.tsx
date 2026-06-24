import { ARZO_COLORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Variant = "app" | "light" | "mark-only";

type Props = {
  size?: number;
  variant?: Variant;
  className?: string;
};

export function ArzoMark({ size = 32, variant = "app", className }: Props) {
  const bg =
    variant === "app"
      ? ARZO_COLORS.jade
      : variant === "light"
        ? ARZO_COLORS.ivory
        : "transparent";
  const aStroke = variant === "light" ? ARZO_COLORS.jade : ARZO_COLORS.ivory;
  const barStroke = variant === "mark-only" ? ARZO_COLORS.jade : ARZO_COLORS.gold;
  const rx = size * 0.234;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0", className)}
      style={{ borderRadius: rx }}
    >
      {variant !== "mark-only" ? <rect width="512" height="512" rx="120" fill={bg} /> : null}
      <path
        d="M150 372 L256 140 L362 372"
        stroke={aStroke}
        strokeWidth="60"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M191 284 L321 284" stroke={barStroke} strokeWidth="34" strokeLinecap="round" />
    </svg>
  );
}
