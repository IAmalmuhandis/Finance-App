import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import { Flashcard } from "@/lib/models/Flashcard";
import { FlashcardSeen } from "@/lib/models/FlashcardSeen";
import { requireAuthUserId } from "@/lib/api-auth";
import { isValidDateStr, pickDailyCardIndex } from "@/lib/flashcards";
import { computeStreak } from "@/lib/flashcards-server";

const Body = z.object({ date: z.string() });

export async function POST(req: Request) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!isValidDateStr(body.date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  await connectMongo();
  const cards = await Flashcard.find().sort({ createdAt: 1 }).select("_id").lean();
  if (cards.length === 0) {
    return NextResponse.json({ error: "No flashcards available yet" }, { status: 404 });
  }
  const idx = pickDailyCardIndex(userId, body.date, cards.length);
  const cardId = (cards[idx] as { _id: unknown })._id;

  // Idempotent — re-marking the same day is a no-op.
  await FlashcardSeen.updateOne(
    { userId, date: body.date },
    { $setOnInsert: { userId, date: body.date, cardId, seenAt: new Date() } },
    { upsert: true }
  );

  const streak = await computeStreak(userId, body.date);
  return NextResponse.json({ streak });
}
