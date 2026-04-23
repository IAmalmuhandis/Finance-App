import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track & formula",
  description: "Income split formula, weekly check-ins, and monthly log.",
};

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
