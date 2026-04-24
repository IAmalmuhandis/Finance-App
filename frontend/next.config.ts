import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Monorepo: load repo-root `.env` so `DATABASE_URL` there is available when Next runs in `frontend/`
const isDev = process.env.NODE_ENV !== "production";
const thisDir = path.dirname(fileURLToPath(import.meta.url));
// Monorepo root: parent of `frontend/` (works for both `repo/frontend` and `repo/src/frontend` layouts)
const monorepoRoot = path.resolve(thisDir, "..");
loadEnvConfig(monorepoRoot, isDev, undefined, true);
loadEnvConfig(thisDir, isDev, undefined, true);

/** `.env.local` is gitignored; merge it in production too so `next start` picks up e.g. GOOGLE_CLIENT_ID. */
function mergeEnvLocal(dir: string) {
  const filePath = path.join(dir, ".env.local");
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
mergeEnvLocal(monorepoRoot);
mergeEnvLocal(thisDir);

const nextConfig: NextConfig = {
  // Multiple package-lock files make Next 16 (Turbopack) pick the wrong root; pin both to the workspace
  // root so `next build` matches `npm`/`package.json` (fixes Render and local warnings)
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  transpilePackages: ["@financeos/database", "@financeos/backend", "@financeos/ai"],
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
