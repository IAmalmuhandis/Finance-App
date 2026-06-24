import { ARZO, COLORS, RADIUS } from "./lib/brand";

export { ARZO };

export const THEME = {
  colors: {
    background: COLORS.ivory,
    surface: COLORS.cloud,
    elevated: COLORS.cloud,
    input: COLORS.cloud,
    sidebar: COLORS.jadeDeep,
    border: COLORS.line,
    primary: COLORS.jade,
    jadeDeep: COLORS.jadeDeep,
    gold: COLORS.gold,
    goldSoft: COLORS.goldSoft,
    accentPositive: COLORS.positive,
    accentAlert: COLORS.alert,
    text: COLORS.ink,
    textSecondary: COLORS.slate,
    textMuted: COLORS.slate,
    textOnJade: COLORS.ivory,
    mutedOnJade: COLORS.mutedOnJade,
    lineOnJade: COLORS.lineOnJade,
  },
  radius: RADIUS,
  fonts: {
    display: "Fraunces_600SemiBold",
    displayRegular: "Fraunces_500Medium",
    ui: "Inter_400Regular",
    uiMedium: "Inter_500Medium",
    uiSemibold: "Inter_600SemiBold",
  },
} as const;
