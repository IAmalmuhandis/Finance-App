import React from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { COLORS } from "../lib/brand";

type Variant = "app" | "light" | "mark-only";

export function ArzoMark({ size = 32, variant = "app" }: { size?: number; variant?: Variant }) {
  const bg = variant === "app" ? COLORS.jade : variant === "light" ? COLORS.ivory : "transparent";
  const aStroke = variant === "light" ? COLORS.jade : COLORS.ivory;
  const barStroke = variant === "mark-only" ? COLORS.jade : COLORS.gold;

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      {variant !== "mark-only" ? <Rect width="512" height="512" rx="120" fill={bg} /> : null}
      <Path
        d="M150 372 L256 140 L362 372"
        stroke={aStroke}
        strokeWidth={60}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M191 284 L321 284" stroke={barStroke} strokeWidth={34} strokeLinecap="round" />
    </Svg>
  );
}
