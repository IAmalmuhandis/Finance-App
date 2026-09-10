import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Entry } from "@/lib/models/Entry";
import { requireAuthUserId } from "@/lib/api-auth";

const TIERS = ["starter", "intermediate", "advance", "custom"] as const;
type Tier = (typeof TIERS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
const GRADUATE_AFTER_DAYS = 90;
const ACTIVITY_WINDOW_DAYS = 30;

type UserTierFields = {
  currentTier?: Tier;
  tierStartedAt?: Date;
  graduateNudgeDismissedTier?: string;
  graduateNudgeDismissedAt?: Date;
};

async function hasConsistentActivity(userId: string, tierStartedAt: Date, now: Date): Promise<boolean> {
  const completeWindows = Math.floor((now.getTime() - tierStartedAt.getTime()) / (ACTIVITY_WINDOW_DAYS * DAY_MS));
  if (completeWindows < 3) return false;

  const entries = await Entry.find({ userId, createdAt: { $gte: tierStartedAt } })
    .select("createdAt")
    .lean();

  const filledWindows = new Set<number>();
  for (const e of entries as { createdAt: Date }[]) {
    const idx = Math.floor((e.createdAt.getTime() - tierStartedAt.getTime()) / (ACTIVITY_WINDOW_DAYS * DAY_MS));
    if (idx >= 0 && idx < completeWindows) filledWindows.add(idx);
  }

  for (let i = 0; i < completeWindows; i++) {
    if (!filledWindows.has(i)) return false;
  }
  return true;
}

async function buildStatus(userId: string, user: UserTierFields) {
  const currentTier: Tier = user.currentTier ?? "starter";
  const tierStartedAt: Date = user.tierStartedAt ?? new Date();
  const now = new Date();

  let eligible = false;
  if (currentTier === "starter" || currentTier === "intermediate") {
    const daysSince = (now.getTime() - tierStartedAt.getTime()) / DAY_MS;
    if (daysSince >= GRADUATE_AFTER_DAYS) {
      eligible = await hasConsistentActivity(userId, tierStartedAt, now);
    }
  }

  const dismissed = user.graduateNudgeDismissedTier === currentTier;

  return {
    currentTier,
    tierStartedAt: tierStartedAt.toISOString(),
    nudge: { eligible: eligible && !dismissed, dismissed },
  };
}

export async function GET(req: Request) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  await connectMongo();
  const user = await User.findById(userId).lean<UserTierFields | null>();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(await buildStatus(userId, user));
}

const Body = z.object({
  tier: z.enum(TIERS).optional(),
  dismissNudge: z.boolean().optional(),
});

export async function POST(req: Request) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectMongo();
  const user = await User.findById(userId).lean<UserTierFields | null>();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  const now = new Date();

  if (body.tier && body.tier !== (user.currentTier ?? "starter")) {
    update.currentTier = body.tier;
    update.tierStartedAt = now;
    update.graduateNudgeDismissedTier = null;
    update.graduateNudgeDismissedAt = null;
  }

  if (body.dismissNudge) {
    update.graduateNudgeDismissedTier = body.tier ?? user.currentTier ?? "starter";
    update.graduateNudgeDismissedAt = now;
  }

  if (Object.keys(update).length > 0) {
    await User.updateOne({ _id: userId }, { $set: update });
  }

  const fresh = await User.findById(userId).lean<UserTierFields | null>();
  if (!fresh) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(await buildStatus(userId, fresh));
}
