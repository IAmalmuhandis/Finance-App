import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Account } from "@/lib/models/Account";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    await connectMongo();
    const body = Body.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    const exists = await User.findOne({ email }).lean();
    if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      email,
      name: body.name ?? null,
      passwordHash,
    });
    await Account.create({
      userId: String(user._id),
      bankName: "Demo Bank",
      nickname: "Primary Account",
      type: "PERSONAL",
      currency: "NGN",
      color: "#3B82F6",
    });
    return NextResponse.json({ user: { id: String(user._id), email: user.email, name: user.name } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Invalid request" }, { status: 400 });
  }
}
