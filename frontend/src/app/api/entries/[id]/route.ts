import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Entry } from "@/lib/models/Entry";
import { requireAuthUserId } from "@/lib/api-auth";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const userId = await requireAuthUserId(_req);
  if (userId instanceof NextResponse) return userId;

  const { id } = await ctx.params;
  await connectMongo();
  const result = await Entry.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
