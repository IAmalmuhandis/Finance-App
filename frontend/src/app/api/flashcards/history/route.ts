import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Flashcard } from "@/lib/models/Flashcard";
import { FlashcardSeen } from "@/lib/models/FlashcardSeen";
import { requireAuthUserId } from "@/lib/api-auth";
import { addDays, isValidDateStr, pickDailyCardIndex, todayUtcStr } from "@/lib/flashcards";

const MAX_DAYS = 90;

export async function GET(req: Request) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  const { searchParams } = new URL(req.url);
  const endParam = searchParams.get("end");
  const end = isValidDateStr(endParam) ? endParam : todayUtcStr();
  const daysParam = Number(searchParams.get("days") ?? "30");
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(1, Math.trunc(daysParam)), MAX_DAYS) : 30;

  await connectMongo();
  const cards = await Flashcard.find().sort({ createdAt: 1 }).lean();
  if (cards.length === 0) {
    return NextResponse.json({ days: [] });
  }

  const dateList: string[] = [];
  for (let i = days - 1; i >= 0; i--) dateList.push(addDays(end, -i));

  const seenDocs = await FlashcardSeen.find({ userId, date: { $in: dateList } })
    .select("date")
    .lean();
  const seenSet = new Set((seenDocs as { date: string }[]).map((d) => d.date));

  const result = dateList.map((date) => {
    const idx = pickDailyCardIndex(userId, date, cards.length);
    const card = cards[idx] as { front: string; source: string; category: string };
    return {
      date,
      card: { front: card.front, source: card.source, category: card.category },
      seen: seenSet.has(date),
    };
  });

  return NextResponse.json({ days: result });
}
