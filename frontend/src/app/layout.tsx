import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { VAULTLY } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: VAULTLY.name,
  description: `${VAULTLY.name} — ${VAULTLY.tagline}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-bg-app font-sans text-text-primary">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
