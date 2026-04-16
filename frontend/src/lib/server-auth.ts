import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

export async function requireUser() {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}
