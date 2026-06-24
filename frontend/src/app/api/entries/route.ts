import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import { Entry } from "@/lib/models/Entry";
import { requireAuthUserId } from "@/lib/api-auth";

const AllocationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["Keep", "Spend", "Give"]),
  amount: z.number().int().nonnegative(),
});

const Body = z.object({
  grossAmount: z.number().positive(),
  mode: z.enum(["recommended", "custom"]),
  formulaSnapshot: z.array(z.unknown()),
  allocations: z.array(AllocationSchema).min(1),
});

export async function GET(req: Request) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  await connectMongo();
  const entries = await Entry.find({ userId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({
    entries: entries.map((e) => ({
      id: String(e._id),
      createdAt: e.createdAt,
      grossAmount: e.grossAmount,
      mode: e.mode,
      allocations: e.allocations,
    })),
  });
}

export async function POST(req: Request) {
    const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  try {
    const body = Body.parse(await req.json());
    await connectMongo();
    const entry = await Entry.create({
      userId,
      grossAmount: body.grossAmount,
      mode: body.mode,
      formulaSnapshot: body.formulaSnapshot,
      allocations: body.allocations,
    });
    return NextResponse.json({
      entry: {
        id: String(entry._id),
        createdAt: entry.createdAt,
        grossAmount: entry.grossAmount,
        mode: entry.mode,
        allocations: entry.allocations,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  await connectMongo();
  const result = await Entry.deleteMany({ userId });
  return NextResponse.json({ deleted: result.deletedCount });
}
