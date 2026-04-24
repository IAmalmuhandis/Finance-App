import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

/** Same geometry as `frontend/public/vaultly-mark.svg` for brand parity with web. */
export function VaultlyMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Rect x="1.5" y="1.5" width="29" height="29" rx="7.5" fill="#0F1624" stroke="#1E2D45" strokeWidth={1} />
      <Path
        d="M16 7L9.5 10.5V17.5C9.5 21.5 12.5 25.5 16 26.5C19.5 25.5 22.5 21.5 22.5 17.5V10.5L16 7Z"
        stroke="#3B82F6"
        strokeWidth={1.75}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M16 14V21" stroke="#3B82F6" strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M13 14H19" stroke="#3B82F6" strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}
