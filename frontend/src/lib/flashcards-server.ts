import { FlashcardSeen } from "@/lib/models/FlashcardSeen";
import { addDays } from "@/lib/flashcards";

const STREAK_LOOKBACK = 400;

/** Consecutive-day streak walking backward from `dateStr` through FlashcardSeen. */
export async function computeStreak(userId: string, dateStr: string): Promise<number> {
  const docs = await FlashcardSeen.find({ userId, date: { $lte: dateStr } })
    .sort({ date: -1 })
    .limit(STREAK_LOOKBACK)
    .select("date")
    .lean();
  const seenDates = new Set((docs as { date: string }[]).map((d) => d.date));

  let cursor = dateStr;
  if (!seenDates.has(cursor)) cursor = addDays(cursor, -1);

  let streak = 0;
  while (seenDates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
