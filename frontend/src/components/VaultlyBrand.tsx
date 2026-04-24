import { VAULTLY } from "@/lib/brand";

type VaultlyBrandProps = {
  /** Pixel size of the mark (width & height). */
  markSize?: number;
  /** Show product name next to the mark. */
  showName?: boolean;
  /** Larger title style for auth screens. */
  variant?: "sidebar" | "hero";
  className?: string;
};

export function VaultlyBrand({
  markSize = 32,
  showName = true,
  variant = "sidebar",
  className = "",
}: VaultlyBrandProps) {
  const nameClass =
    variant === "hero"
      ? "text-2xl font-semibold tracking-tight text-text-primary"
      : "text-[18px] font-semibold tracking-tight text-text-primary";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src="/vaultly-mark.svg" width={markSize} height={markSize} alt="" aria-hidden />
      {showName ? <span className={nameClass}>{VAULTLY.name}</span> : null}
    </div>
  );
}
