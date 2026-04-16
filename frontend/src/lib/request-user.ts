import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

export async function getRequestUserId() {
  const session = (await getServerSession(authOptions)) as any;
  return session?.user?.id || "demo-user";
}

