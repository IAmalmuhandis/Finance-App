import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance OS",
  description: "Personal Financial Intelligence System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-bg-app font-sans text-text-primary">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
