import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { connectMongo } from "@/lib/mongodb";
import { WealthProjection } from "@/lib/models/WealthProjection";
import { requireAuthUserId } from "@/lib/api-auth";

export const runtime = "nodejs";

const GREEN = "#1a5c46";
const RED = "#c0392b";
const GRAY = "#666666";
const DARK = "#1a1a1a";
const SOFT_GREEN = "#e8f5f0";
const SOFT_GRAY = "#f7faf8";

function naira(n: number) {
  return "NGN " + Math.round(n).toLocaleString("en-NG");
}

function pct(n: number) {
  return n.toFixed(1) + "%";
}

type Col = { label: string; x: number; width: number; align: "left" | "right" | "center" };

const TABLE_COLS: Col[] = [
  { label: "#",             x: 40,  width: 28,  align: "center" },
  { label: "Initial Cap",  x: 72,  width: 95,  align: "right"  },
  { label: "+Added",       x: 171, width: 85,  align: "right"  },
  { label: "+Income",      x: 260, width: 85,  align: "right"  },
  { label: "-Consumed",    x: 349, width: 85,  align: "right"  },
  { label: "New Capital",  x: 438, width: 117, align: "right"  },
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId(req);
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  await connectMongo();

  const projection = await WealthProjection.findOne({ _id: id, userId }).lean();
  if (!projection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const input  = projection.input  as Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary = projection.summary as Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows   = (projection.rows || []) as Record<string, any>[];
  const name   = (projection.name as string) || "Wealth Projection";

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Header ───────────────────────────────────────────────────────────────
    doc.fontSize(20).fillColor(GREEN).font("Helvetica-Bold").text("Arzo — Wealth Guide Report");
    doc.fontSize(12).fillColor(DARK).font("Helvetica").text(name);
    doc.fontSize(9).fillColor(GRAY).text(
      "Generated " +
        new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    );
    doc.moveDown(0.4);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(GREEN).lineWidth(2).stroke();
    doc.moveDown(0.8);

    // ── Helpers ──────────────────────────────────────────────────────────────
    function sectionTitle(title: string) {
      doc.fontSize(11).fillColor(DARK).font("Helvetica-Bold").text(title);
      const lineY = doc.y + 2;
      doc.moveTo(40, lineY).lineTo(555, lineY).strokeColor("#cccccc").lineWidth(0.8).stroke();
      doc.font("Helvetica");
      doc.y = lineY + 6;
    }

    function kvRow(label: string, value: string, valueColor = DARK, shade = false) {
      const y = doc.y;
      if (shade) doc.rect(40, y, 515, 18).fill(SOFT_GRAY).stroke("transparent");
      doc.fontSize(10).fillColor(GRAY).font("Helvetica").text(label, 45, y + 3, { width: 260 });
      doc.fontSize(10).fillColor(valueColor).text(value, 305, y + 3, { width: 250, align: "right" });
      doc.y = y + 20;
    }

    // ── Inputs ───────────────────────────────────────────────────────────────
    sectionTitle("Projection Inputs");
    kvRow("Initial Capital",        naira(input.initialCapital),         DARK,  false);
    kvRow("Income Rate",            pct(input.incomeRate) + " / tx",     DARK,  true);
    kvRow("Consumption Rate",       pct(input.consumptionRate) + " / tx",DARK,  false);
    kvRow("Additional Capital Rate",pct(input.additionalCapitalRate) + " / tx", DARK, true);
    kvRow("Number of Transactions", String(input.numTransactions),       DARK,  false);
    if (input.targetWealth) kvRow("Target Wealth", naira(input.targetWealth), DARK, true);
    doc.moveDown(0.8);

    // ── Summary ──────────────────────────────────────────────────────────────
    sectionTitle("Summary");
    kvRow("Final Capital",         naira(summary.finalCapital),            DARK,  false);
    kvRow("Net Growth",            pct(summary.netGrowthPct),              summary.netGrowthPct >= 0 ? GREEN : RED, true);
    kvRow("Total Income Earned",   naira(summary.totalIncome),             GREEN, false);
    kvRow("Total Consumed",        naira(summary.totalConsumption),        RED,   true);
    kvRow("Total Added Externally",naira(summary.totalAdditional),         GREEN, false);
    kvRow("Wealth Status",
      summary.isGrowing ? "Growing ▲" : "Shrinking ▼",
      summary.isGrowing ? GREEN : RED,
      true
    );
    if (input.targetWealth && summary.targetReachedAt != null) {
      kvRow("Target Reached At", "Transaction #" + summary.targetReachedAt, GREEN, false);
    }
    doc.moveDown(0.8);

    // ── Transaction Table ─────────────────────────────────────────────────────
    sectionTitle("Transaction Table  (" + rows.length + " transactions)");

    // Table header
    let hY = doc.y;
    doc.rect(40, hY, 515, 18).fill(SOFT_GREEN).stroke("transparent");
    TABLE_COLS.forEach((col) => {
      doc.fontSize(8.5).fillColor("#333").font("Helvetica-Bold")
        .text(col.label, col.x, hY + 4, { width: col.width, align: col.align });
    });
    doc.font("Helvetica");
    doc.y = hY + 20;

    // Table rows
    rows.forEach((row, i) => {
      if (doc.y > 760) {
        doc.addPage();
        // Repeat column headers on new page
        hY = doc.y;
        doc.rect(40, hY, 515, 18).fill(SOFT_GREEN).stroke("transparent");
        TABLE_COLS.forEach((col) => {
          doc.fontSize(8.5).fillColor("#333").font("Helvetica-Bold")
            .text(col.label, col.x, hY + 4, { width: col.width, align: col.align });
        });
        doc.font("Helvetica");
        doc.y = hY + 20;
      }

      const rY = doc.y;
      if (i % 2 === 0) doc.rect(40, rY, 515, 16).fill(SOFT_GRAY).stroke("transparent");

      const growing = Number(row.newCapital) >= Number(row.initialCapital);
      doc.fontSize(8.5);
      doc.fillColor(GRAY).text(String(row.no), TABLE_COLS[0].x, rY + 3, { width: TABLE_COLS[0].width, align: "center" });
      doc.fillColor(DARK).text(naira(row.initialCapital), TABLE_COLS[1].x, rY + 3, { width: TABLE_COLS[1].width, align: "right" });
      doc.fillColor(GREEN).text(naira(row.additionalCapital), TABLE_COLS[2].x, rY + 3, { width: TABLE_COLS[2].width, align: "right" });
      doc.fillColor(GREEN).text(naira(row.income), TABLE_COLS[3].x, rY + 3, { width: TABLE_COLS[3].width, align: "right" });
      doc.fillColor(RED).text(naira(row.consumption), TABLE_COLS[4].x, rY + 3, { width: TABLE_COLS[4].width, align: "right" });
      doc.fillColor(growing ? GREEN : RED).font("Helvetica-Bold")
        .text(naira(row.newCapital), TABLE_COLS[5].x, rY + 3, { width: TABLE_COLS[5].width, align: "right" });
      doc.font("Helvetica");
      doc.y = rY + 18;
    });

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(1);
    doc
      .fontSize(8)
      .fillColor(GRAY)
      .text("Arzo Wealth Guide  ·  finance-app-0cwn.onrender.com", { align: "center" });

    doc.end();
  });

  const slug = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60) || "projection";

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
