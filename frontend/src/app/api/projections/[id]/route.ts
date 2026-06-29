import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { WealthProjection } from "@/lib/models/WealthProjection";
import { requireAuthUserId } from "@/lib/api-auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  await connectMongo();
  const doc = await WealthProjection.findOne({ _id: id, userId }).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    projection: {
      id: String(doc._id),
      name: doc.name ?? "",
      createdAt: doc.createdAt,
      summary: doc.summary,
      input: doc.input,
      rows: doc.rows,
    },
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  await connectMongo();
  const result = await WealthProjection.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
