import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { connectMongo } from "@/lib/mongodb";
import { WealthProjection } from "@/lib/models/WealthProjection";
import { requireAuthUserId } from "@/lib/api-auth";

export const runtime = "nodejs";

// Colors as rgb() values
const GREEN  = rgb(0.102, 0.361, 0.275);   // #1a5c46
const RED    = rgb(0.753, 0.224, 0.169);   // #c0392b
const GRAY   = rgb(0.4,   0.4,   0.4);
const DARK   = rgb(0.102, 0.102, 0.102);
const LIGHT  = rgb(0.969, 0.980, 0.969);   // soft green tint for header rows
const STRIPE = rgb(0.969, 0.976, 0.969);   // very subtle stripe

function naira(n: number) {
  return "NGN " + Math.round(Number(n) || 0).toLocaleString("en-NG");
}

function pct(n: number) {
  return (Number(n) || 0).toFixed(1) + "%";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuthUserId(req);
    if (userId instanceof NextResponse) return userId;

    const { id } = await params;
    await connectMongo();

    const projection = await WealthProjection.findOne({ _id: id, userId }).lean();
    if (!projection) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input   = (projection.input   ?? {}) as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary = (projection.summary ?? {}) as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows    = ((projection.rows   ?? []) as Record<string, any>[]);
    const name    = (projection.name as string) || "Wealth Projection";

    const pdfDoc = await PDFDocument.create();
    const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 595;
    const PAGE_H = 842;
    const ML = 40;
    const MR = 40;
    const CONTENT_W = PAGE_W - ML - MR;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - 50;

    function newPage() {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 50;
    }

    function checkSpace(needed: number) {
      if (y < needed + 60) newPage();
    }

    function drawText(
      text: string,
      x: number,
      yPos: number,
      opts: { font?: typeof fontReg; size?: number; color?: ReturnType<typeof rgb>; align?: "left" | "right" | "center"; maxWidth?: number }
    ) {
      const font  = opts.font  ?? fontReg;
      const size  = opts.size  ?? 10;
      const color = opts.color ?? DARK;
      const maxW  = opts.maxWidth ?? CONTENT_W;

      let drawX = x;
      if (opts.align === "right") {
        const tw = font.widthOfTextAtSize(text, size);
        drawX = x + maxW - tw;
      } else if (opts.align === "center") {
        const tw = font.widthOfTextAtSize(text, size);
        drawX = x + (maxW - tw) / 2;
      }
      page.drawText(text, { x: drawX, y: yPos, size, font, color });
    }

    function drawRect(x: number, yPos: number, w: number, h: number, color: ReturnType<typeof rgb>) {
      page.drawRectangle({ x, y: yPos, width: w, height: h, color, borderWidth: 0 });
    }

    function drawLine(x1: number, y1: number, x2: number, y2: number, color: ReturnType<typeof rgb>, thickness = 1) {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
    }

    // ── Header ────────────────────────────────────────────────────────────────
    drawText("Arzo - Wealth Guide", ML, y, { font: fontBold, size: 20, color: GREEN });
    y -= 24;
    drawText(name, ML, y, { font: fontBold, size: 13, color: DARK });
    y -= 18;
    const dateStr = new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
    drawText("Generated " + dateStr, ML, y, { font: fontReg, size: 9, color: GRAY });
    y -= 10;
    drawLine(ML, y, PAGE_W - MR, y, GREEN, 2);
    y -= 20;

    // ── Section title ─────────────────────────────────────────────────────────
    function sectionTitle(title: string) {
      checkSpace(40);
      y -= 8;
      drawText(title, ML, y, { font: fontBold, size: 11, color: DARK });
      y -= 14;
      drawLine(ML, y, PAGE_W - MR, y, rgb(0.8, 0.8, 0.8), 0.8);
      y -= 10;
    }

    // ── KV row ────────────────────────────────────────────────────────────────
    function kvRow(label: string, value: string, valueColor = DARK, shade = false) {
      checkSpace(20);
      if (shade) drawRect(ML, y - 4, CONTENT_W, 18, STRIPE);
      drawText(label, ML + 5, y, { font: fontReg, size: 10, color: GRAY });
      drawText(value, ML,     y, { font: fontReg, size: 10, color: valueColor, align: "right", maxWidth: CONTENT_W });
      y -= 20;
    }

    // ── Inputs ────────────────────────────────────────────────────────────────
    sectionTitle("Projection Inputs");
    kvRow("Initial Capital",         naira(input.initialCapital),                       DARK,  false);
    kvRow("Income Rate",             pct(input.incomeRate) + " per transaction",        DARK,  true);
    kvRow("Consumption Rate",        pct(input.consumptionRate) + " per transaction",   DARK,  false);
    kvRow("Additional Capital Rate", pct(input.additionalCapitalRate) + " per tx",      DARK,  true);
    kvRow("Number of Transactions",  String(input.numTransactions || ""),               DARK,  false);
    if (input.targetWealth) kvRow("Target Wealth", naira(input.targetWealth),           DARK,  true);

    // ── Summary ───────────────────────────────────────────────────────────────
    sectionTitle("Summary");
    kvRow("Final Capital",          naira(summary.finalCapital),            DARK,  false);
    kvRow("Net Growth",             pct(summary.netGrowthPct),              Number(summary.netGrowthPct) >= 0 ? GREEN : RED, true);
    kvRow("Total Income Earned",    naira(summary.totalIncome),             GREEN, false);
    kvRow("Total Consumed",         naira(summary.totalConsumption),        RED,   true);
    kvRow("Total Added Externally", naira(summary.totalAdditional),         GREEN, false);
    kvRow("Wealth Status",          summary.isGrowing ? "Growing" : "Shrinking", summary.isGrowing ? GREEN : RED, true);
    if (input.targetWealth && summary.targetReachedAt != null) {
      kvRow("Target Reached At", "Transaction #" + summary.targetReachedAt, GREEN, false);
    }

    // ── Transaction Table ─────────────────────────────────────────────────────
    sectionTitle("Transaction Table (" + rows.length + " transactions)");

    // Column definitions: [label, x offset from ML, width, align]
    type ColDef = [string, number, number, "left" | "right" | "center"];
    const COLS: ColDef[] = [
      ["#",           0,   28, "center"],
      ["Initial Cap", 32,  90, "right" ],
      ["+Added",      126, 82, "right" ],
      ["+Income",     212, 82, "right" ],
      ["-Consumed",   298, 82, "right" ],
      ["New Capital", 384, 131,"right" ],
    ];

    function tableHeader() {
      checkSpace(24);
      drawRect(ML, y - 4, CONTENT_W, 20, LIGHT);
      COLS.forEach(([label, xOff, w, align]) => {
        drawText(label, ML + xOff, y, { font: fontBold, size: 8.5, color: DARK, align, maxWidth: w });
      });
      y -= 22;
    }

    tableHeader();

    rows.forEach((row, i) => {
      if (y < 80) { newPage(); tableHeader(); }
      if (i % 2 === 0) drawRect(ML, y - 4, CONTENT_W, 17, STRIPE);
      const growing = Number(row.newCapital) >= Number(row.initialCapital);
      COLS.forEach(([, xOff, w, align], ci) => {
        let text = "";
        let color = DARK;
        switch (ci) {
          case 0: text = String(row.no);                   color = GRAY;               break;
          case 1: text = naira(row.initialCapital);        color = DARK;               break;
          case 2: text = naira(row.additionalCapital);     color = GREEN;              break;
          case 3: text = naira(row.income);                color = GREEN;              break;
          case 4: text = naira(row.consumption);           color = RED;                break;
          case 5: text = naira(row.newCapital);            color = growing ? GREEN : RED; break;
        }
        drawText(text, ML + xOff, y, {
          font: ci === 5 ? fontBold : fontReg,
          size: 8.5, color, align, maxWidth: w,
        });
      });
      y -= 18;
    });

    // ── Footer ────────────────────────────────────────────────────────────────
    y -= 16;
    drawLine(ML, y, PAGE_W - MR, y, rgb(0.8, 0.8, 0.8), 0.5);
    y -= 12;
    drawText("Arzo Wealth Guide - finance-app-0cwn.onrender.com", ML, y, {
      font: fontReg, size: 8, color: GRAY, align: "center", maxWidth: CONTENT_W,
    });

    const pdfBytes = await pdfDoc.save();

    const slug = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60) || "projection";

    return new Response(pdfBytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}.pdf"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (err) {
    console.error("[pdf route]", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
