import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { WealthProjection } from "@/lib/models/WealthProjection";
import { requireAuthUserId } from "@/lib/api-auth";

export async function GET(req: Request) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  await connectMongo();
  const docs = await WealthProjection.find({ userId })
    .sort({ createdAt: -1 })
    .select("-rows")
    .lean();

  return NextResponse.json({
    projections: docs.map((d) => ({
      id: String(d._id),
      name: d.name ?? "",
      createdAt: d.createdAt,
      summary: d.summary,
      input: d.input,
    })),
  });
}

export async function POST(req: Request) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  let body: { name?: string; input: unknown; summary: unknown; rows: unknown[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.input || !body.summary) {
    return NextResponse.json({ error: "input and summary are required" }, { status: 400 });
  }

  await connectMongo();
  const doc = await WealthProjection.create({
    userId,
    name: body.name ?? "",
    input: body.input,
    summary: body.summary,
    rows: (body.rows ?? []).slice(0, 200),
  });

  return NextResponse.json({
    projection: {
      id: String(doc._id),
      name: doc.name,
      createdAt: doc.createdAt,
      summary: doc.summary,
      input: doc.input,
    },
  });
}
