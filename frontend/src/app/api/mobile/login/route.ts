import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { createMobileAccessToken } from "@/lib/mobile-token";
import { corsOptions, withCors } from "@/lib/api-cors";

export async function OPTIONS() {
  return corsOptions();
}

export async function POST(req: Request) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return withCors(NextResponse.json({ error: "Server auth is not configured" }, { status: 500 }));
    }
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return withCors(NextResponse.json({ error: "Email and password are required" }, { status: 400 }));
    }
    await connectMongo();
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return withCors(NextResponse.json({ error: "Invalid credentials" }, { status: 401 }));
    }
    const ok = await bcrypt.compare(password, (user as { passwordHash: string }).passwordHash);
    if (!ok) {
      return withCors(NextResponse.json({ error: "Invalid credentials" }, { status: 401 }));
    }
    const id = String((user as { _id: unknown })._id);
    const token = createMobileAccessToken(id, secret);
    return withCors(NextResponse.json({ token }));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Login failed";
    return withCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
