/**
 * Seeds the `flashcards` collection with the daily-principle card content.
 * Safe to re-run — upserts by `front` text, so no duplicates are created.
 * Run from frontend/: npx tsx scripts/seed-flashcards.mts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fe = path.join(__dirname, "..");

function loadEnvs() {
  for (const f of [path.join(fe, "../.env"), path.join(fe, ".env.local"), path.join(fe, ".env")]) {
    if (existsSync(f)) {
      const s = readFileSync(f, "utf8");
      for (const line of s.split("\n")) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(?:"([^"]*)"|'(.*)')\s*$/i);
        if (m) {
          const k = m[1]!;
          const v = m[2] !== undefined ? m[2] : m[3] || "";
          if (process.env[k] === undefined) process.env[k] = v;
        }
      }
    }
  }
}
loadEnvs();

const MONGO_URI =
  process.env.MONGODB_DIRECT_URI?.trim() || process.env.MONGODB_URI?.trim() || process.env.DATABASE_URL?.trim();
if (!MONGO_URI) {
  console.error("Set MONGODB_DIRECT_URI, MONGODB_URI, or DATABASE_URL in frontend/.env.local (or monorepo .env).");
  process.exit(1);
}

type Category = "mindset" | "habits" | "assets" | "behavior" | "saving";
type Seed = { front: string; source: string; category: Category; back: string };

const CARDS: Seed[] = [
  // The Psychology of Money (Morgan Housel)
  {
    front: "Wealth is what you don't see — it's the spending you skipped, not the car in the driveway.",
    source: "The Psychology of Money",
    category: "saving",
    back: "Every naira that quietly lands in Investment or Emergency instead of Personal Consumption is wealth building in the background.",
  },
  {
    front: "Compounding rewards patience far more than it rewards brilliance.",
    source: "The Psychology of Money",
    category: "mindset",
    back: "Your Investment bucket compounds fastest when you leave it alone — consistency beats timing.",
  },
  {
    front: "The gap between what you earn and what you keep matters more than how much you earn.",
    source: "The Psychology of Money",
    category: "saving",
    back: "That's exactly what your Wealth Retained total on Progress measures — grow the gap, not just the income.",
  },
  {
    front: "Room for error protects you from the one mistake that erases years of good decisions.",
    source: "The Psychology of Money",
    category: "behavior",
    back: "Your Emergency bucket exists so one bad month doesn't undo months of good ones.",
  },
  {
    front: "Nobody is \"bad with money\" — everyone is just working from a different set of experiences.",
    source: "The Psychology of Money",
    category: "mindset",
    back: "If a tier feels too aggressive right now, Starter exists so discipline can build before ambition does.",
  },
  {
    front: "Getting money and keeping money are different skills. Humility keeps what boldness built.",
    source: "The Psychology of Money",
    category: "behavior",
    back: "Give a bucket too — the Give allocation is a built-in check against overconfidence with what you keep.",
  },
  {
    front: "Define \"enough\" for yourself before the market or your peers define it for you.",
    source: "The Psychology of Money",
    category: "mindset",
    back: "Personal Consumption is capped on purpose — decide your \"enough\" before your income decides it for you.",
  },
  {
    front: "The highest dividend money pays is control over how you spend your own time.",
    source: "The Psychology of Money",
    category: "mindset",
    back: "Splitting income the moment it arrives buys back the hours you'd otherwise spend agonizing over where it should go.",
  },
  // Rich Dad Poor Dad (Robert Kiyosaki)
  {
    front: "Assets put money in your pocket. Liabilities take money out. Know which is which before you buy.",
    source: "Rich Dad Poor Dad",
    category: "assets",
    back: "Your Investment (Keep) bucket is where assets get funded — treat it as untouchable.",
  },
  {
    front: "Buy assets first, luxuries last — most people do it backward and call it bad luck.",
    source: "Rich Dad Poor Dad",
    category: "assets",
    back: "That's the whole point of splitting income before it ever reaches your spending money.",
  },
  {
    front: "Financial literacy is rarely taught. If you want it, you have to go get it yourself.",
    source: "Rich Dad Poor Dad",
    category: "mindset",
    back: "Every tier's explainer copy exists to teach the \"why\" behind a split, not just the \"how much\".",
  },
  {
    front: "Trading time for money has a ceiling. Owning things that earn money does not.",
    source: "Rich Dad Poor Dad",
    category: "assets",
    back: "Your Investment allocation is how you start earning without trading more hours.",
  },
  {
    front: "The first real investment is usually the hardest one to make — fear talks people out of it.",
    source: "Rich Dad Poor Dad",
    category: "assets",
    back: "Your first saved entry is proof you already crossed that line — Progress tracks it from day one.",
  },
  // Atomic Habits (James Clear)
  {
    front: "You don't rise to the level of your goals. You fall to the level of your systems.",
    source: "Atomic Habits",
    category: "habits",
    back: "The tier system exists so your split is automatic, not a decision you re-make every payday.",
  },
  {
    front: "Every naira saved is a small vote for the identity of \"someone who saves.\"",
    source: "Atomic Habits",
    category: "habits",
    back: "Every saved entry on Progress is a small vote for that identity — the chart is your voting record.",
  },
  {
    front: "Make good money habits obvious and easy. Make bad ones invisible and hard.",
    source: "Atomic Habits",
    category: "habits",
    back: "That's why the preset tiers are read-only — one less decision standing between you and consistency.",
  },
  {
    front: "Willpower runs out. Environment doesn't — remove friction from what you want to do more of.",
    source: "Atomic Habits",
    category: "habits",
    back: "Splitting income the moment it arrives removes the willpower test entirely.",
  },
  {
    front: "Missing once is an accident. Missing twice is the start of a new habit — get back on track fast.",
    source: "Atomic Habits",
    category: "habits",
    back: "Missed a month on Progress? Save your next entry today — one gap doesn't break the habit.",
  },
  {
    front: "Attach a new saving habit to something you already do daily, and it sticks faster.",
    source: "Atomic Habits",
    category: "habits",
    back: "Pair opening Arzo with payday itself, so the split happens before spending starts.",
  },
  // General finance & behavior principles
  {
    front: "Pay yourself first — treat saving as the first bill, not whatever's left over.",
    source: "General finance principles",
    category: "saving",
    back: "Investment and Emergency come off the top in every tier — before Personal Consumption ever sees the money.",
  },
  {
    front: "A plan tells your money where to go. Without one, you just wonder where it went.",
    source: "General finance principles",
    category: "behavior",
    back: "That's literally what your formula tree is — a plan, mapped to naira, before you spend a kobo.",
  },
  {
    front: "Debt is a claim on your future income. Every naira borrowed is spent twice — once now, once later with interest.",
    source: "General finance principles",
    category: "behavior",
    back: "Keep Emergency funded so a surprise expense doesn't force you to borrow against tomorrow's split.",
  },
  {
    front: "Automate the decision once, and you stop needing willpower every single time it repeats.",
    source: "General finance principles",
    category: "habits",
    back: "Pick a tier once — Starter, Intermediate, or Advance — and let it run without renegotiating it weekly.",
  },
  {
    front: "Lifestyle creep quietly cancels out raises — let savings rise with income before spending does.",
    source: "General finance principles",
    category: "saving",
    back: "As income grows, Personal Consumption's percentage stays fixed — only the naira amount grows with it.",
  },
  {
    front: "Most money problems aren't math problems. They're behavior problems wearing a financial disguise.",
    source: "General finance principles",
    category: "behavior",
    back: "The Graduate nudge exists because moving tiers should follow proven behavior, not a mood.",
  },
  {
    front: "Give first, save second, spend last. The order changes what's left to negotiate with yourself.",
    source: "General finance principles",
    category: "behavior",
    back: "That's the exact order every Arzo tier is built in: Give off the top, then Keep, then Spend.",
  },
  {
    front: "Net worth grows in your habits before it ever shows up in your balance.",
    source: "General finance principles",
    category: "habits",
    back: "Watch the Wealth Retained chart on Progress — it's your habits made visible.",
  },
  {
    front: "A budget isn't a cage. It's the fastest way to see which spending was actually a choice.",
    source: "General finance principles",
    category: "behavior",
    back: "Custom mode exists so the split fits your life, not the other way around.",
  },
  {
    front: "The best financial plan is the one you'll actually follow — not the perfect one you'll abandon in a month.",
    source: "General finance principles",
    category: "behavior",
    back: "If Advance feels like too much too soon, Starter is a legitimate long-term choice, not just a starting point.",
  },
  {
    front: "Small, boring, repeated decisions build more wealth than one dramatic smart move.",
    source: "General finance principles",
    category: "mindset",
    back: "Saving one entry today is small. Thirty entries from now, Progress will show you it wasn't.",
  },
];

const FlashcardSchema = new mongoose.Schema({
  front: { type: String, required: true },
  back: { type: String, required: true },
  source: { type: String, required: true },
  category: { type: String, enum: ["mindset", "habits", "assets", "behavior", "saving"], required: true },
  createdAt: { type: Date, default: Date.now },
});
const Flashcard = mongoose.models.Flashcard || mongoose.model("Flashcard", FlashcardSchema);

async function main() {
  await mongoose.connect(MONGO_URI!, { family: 4 });
  let inserted = 0;
  let skipped = 0;
  for (const card of CARDS) {
    const res = await Flashcard.updateOne(
      { front: card.front },
      { $setOnInsert: card },
      { upsert: true }
    );
    if (res.upsertedCount && res.upsertedCount > 0) inserted++;
    else skipped++;
  }
  console.log(`Flashcards seeded: ${inserted} inserted, ${skipped} already present (${CARDS.length} total).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
