import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Flashcard } from "@/lib/models/Flashcard";
import { FlashcardSeen } from "@/lib/models/FlashcardSeen";
import { requireAuthUserId } from "@/lib/api-auth";
import { isValidDateStr, pickDailyCardIndex, todayUtcStr } from "@/lib/flashcards";
import { computeStreak } from "@/lib/flashcards-server";

export async function GET(req: Request) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const date = isValidDateStr(dateParam) ? dateParam : todayUtcStr();

  await connectMongo();
  const cards = await Flashcard.find().sort({ createdAt: 1 }).lean();
  if (cards.length === 0) {
    return NextResponse.json({ error: "No flashcards available yet" }, { status: 404 });
  }

  const idx = pickDailyCardIndex(userId, date, cards.length);
  const card = cards[idx] as { _id: unknown; front: string; back: string; source: string; category: string };

  const [seenDoc, streak] = await Promise.all([
    FlashcardSeen.findOne({ userId, date }).lean(),
    computeStreak(userId, date),
  ]);

  return NextResponse.json({
    date,
    card: {
      id: String(card._id),
      front: card.front,
      back: card.back,
      source: card.source,
      category: card.category,
    },
    seen: Boolean(seenDoc),
    streak,
  });
}
