import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getRequestUserId } from "@/lib/request-user";
import { FormulaTracker } from "@/lib/models/FormulaTracker";
import { corsOptions, withCors } from "@/lib/api-cors";

const defaultFormula = {
  stocks: 20,
  emergency: 10,
  obligations: 30,
  food: 25,
  flex: 15,
};

export async function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const doc = await FormulaTracker.findOne({ userId }).lean();
    if (!doc) {
      return withCors(
        NextResponse.json({
          income: 0,
          formula: defaultFormula,
          checkins: [],
          monthlyLog: [],
          persisted: false,
        })
      );
    }
    return withCors(
      NextResponse.json({
        income: doc.income ?? 0,
        formula: doc.formula ?? defaultFormula,
        checkins: doc.checkins ?? [],
        monthlyLog: doc.monthlyLog ?? [],
        persisted: true,
      })
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load tracker";
    return withCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}

export async function PUT(req: Request) {
  try {
    await connectMongo();
    const userId = await getRequestUserId();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return withCors(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }));
    }
    const { income, formula, checkins, monthlyLog } = body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (typeof income === "number" && Number.isFinite(income)) update.income = income;
    if (formula && typeof formula === "object") update.formula = formula;
    if (Array.isArray(checkins)) update.checkins = checkins;
    if (Array.isArray(monthlyLog)) update.monthlyLog = monthlyLog;
    await FormulaTracker.findOneAndUpdate(
      { userId },
      { $set: { ...update, userId } },
      { upsert: true, new: true }
    );
    return withCors(NextResponse.json({ ok: true }));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to save tracker";
    return withCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
