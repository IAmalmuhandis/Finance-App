import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { DateRangeProvider } from "@/components/date-range-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user?.id) redirect("/");
  return (
    <DateRangeProvider>
      <Sidebar />
      <main className="min-h-screen bg-bg-app md:ml-[240px]">{children}</main>
    </DateRangeProvider>
  );
}
