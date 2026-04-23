/**
 * Dev helper: prints a non-SRV `mongodb://` line you can set as MONGODB_DIRECT_URI.
 * Run from frontend/: npx tsx scripts/print-mongo-direct-uri.mts
 * (Uses .env.local + root ../.env — does not print the password, only a placeholder @.)
 */
import dns from "node:dns";
import { promises as dnsP } from "node:dns";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ConnectionString from "mongodb-connection-string-url";

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
          if (process.env[k] === undefined) {
            process.env[k] = v;
          }
        }
      }
    }
  }
}
loadEnvs();
const src = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!src) {
  console.error("Set MONGODB_URI or DATABASE_URL in frontend/.env.local (or monorepo .env).");
  process.exit(1);
}
if (!src.startsWith("mongodb+srv://")) {
  console.log("Already a direct (non-SRV) URI. Use MONGODB_URI or MONGODB_DIRECT_URI as-is.");
  process.exit(0);
}
try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {
  /* */
}
const c = new ConnectionString(src);
if (!c.isSRV) {
  console.log("Not SRV; nothing to do.");
  process.exit(0);
}
const seed = c.hosts[0];
if (!seed) {
  process.exit(1);
}
const fqdn = `_mongodb._tcp.${seed}`;
const [txtRecs, srvRecords] = await Promise.all([dnsP.resolveTxt(fqdn), dnsP.resolveSrv(fqdn)]);

const flatTxt = (txtRecs as string[][]).map((chunks) => chunks.join("")).join("");
for (const part of flatTxt.split("&")) {
  if (!part) {
    continue;
  }
  const eq = part.indexOf("=");
  if (eq === -1) {
    c.searchParams.set(part, "");
  } else {
    c.searchParams.set(part.slice(0, eq), part.slice(eq + 1));
  }
}
if (!c.searchParams.has("tls") && !c.searchParams.has("ssl")) {
  c.searchParams.set("tls", "true");
}
const hostStr = [...srvRecords]
  .sort((a, b) => a.priority - b.priority || a.weight - b.weight)
  .map((r) => `${r.name}:${r.port}`)
  .join(",");
if (!hostStr) {
  console.error("No SRV hosts returned.");
  process.exit(1);
}
const auth =
  typeof c.username === "string" && c.username
    ? `${encodeURIComponent(c.username)}:${encodeURIComponent(c.password || "")}@`
    : "";
const patha = c.pathname && c.pathname.length > 0 ? c.pathname : "/";
const query = c.searchParams.toString();
const redacted = `mongodb://USER:REDACTED@${hostStr}${patha}${query ? `?${query}` : ""}`;

const built = `mongodb://${auth}${hostStr}${patha}${query ? `?${query}` : ""}`;
if (!built.startsWith("mongodb://")) {
  process.exit(1);
}
console.log("\nSet MONGODB_DIRECT_URI=... in frontend/.env.local, then restart Next.\n");
console.log("Redacted preview:\n" + redacted);
console.log("\nFull (keep secret, do not commit):\n" + built + "\n");
