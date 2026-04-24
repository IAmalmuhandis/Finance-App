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
