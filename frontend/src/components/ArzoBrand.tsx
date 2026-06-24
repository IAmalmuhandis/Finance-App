import { ARZO } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { ArzoMark } from "@/components/ArzoMark";

type Props = {
  markSize?: number;
  variant?: "default" | "hero" | "on-jade";
  className?: string;
};

export function ArzoBrand({ markSize = 28, variant = "default", className }: Props) {
  const hero = variant === "hero";
  const onJade = variant === "on-jade";
  const wordClass = onJade ? "text-text-on-jade" : "text-jade";
  const subClass = onJade ? "text-gold-soft" : "text-text-secondary";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ArzoMark size={markSize} variant="app" />
      <div>
        <p
          className={cn(
            "font-display font-semibold tracking-tight",
            wordClass,
            hero ? "text-[2rem] leading-none" : "text-lg leading-none"
          )}
        >
          {ARZO.name}
        </p>
        {hero ? (
          <p className={cn("mt-1 font-display text-sm italic", onJade ? "text-gold-soft" : "text-gold")}>
            {ARZO.tagline}
          </p>
        ) : null}
        {!hero && variant === "default" ? (
          <p className={cn("mt-0.5 text-xs", subClass)}>{ARZO.tagline}</p>
        ) : null}
      </div>
    </div>
  );
}
