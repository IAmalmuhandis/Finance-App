export const ARZO = {
  name: "Arzo",
  tagline: "Give every naira a job.",
  taglineAlt: "Keep more of what you earn.",
  origin: "Arzo comes from Arziki, the Hausa word for wealth and prosperity.",
} as const;

export const ARZO_COLORS = {
  jade: "#0C4A3E",
  jadeDeep: "#082E27",
  ink: "#11201B",
  slate: "#5B6B64",
  gold: "#C9A24B",
  goldSoft: "#EADFBE",
  ivory: "#F6F4EE",
  cloud: "#FFFFFF",
  line: "#E6E1D5",
  positive: "#2E7D5B",
  alert: "#B4543A",
  mutedDark: "#9DB1A8",
  lineDark: "#1C4A40",
} as const;

/** Recommended-bucket bar colours (green → gold family). */
export const ALLOCATION_COLORS: Record<string, string> = {
  Investment: "#0C4A3E",
  "Personal needs": "#3E7C6B",
  Family: "#C9A24B",
  Sadaqah: "#B5843A",
  Emergency: "#6B7A6F",
};

export const RADIUS = {
  card: 20,
  button: 14,
  input: 12,
} as const;
