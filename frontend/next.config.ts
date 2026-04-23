import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Monorepo: load repo-root `.env` so `DATABASE_URL` there is available when Next runs in `frontend/`
const isDev = process.env.NODE_ENV !== "production";
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(thisDir, "..");
loadEnvConfig(monorepoRoot, isDev, undefined, true);
loadEnvConfig(thisDir, isDev, undefined, true);

const nextConfig: NextConfig = {
  transpilePackages: ["@financeos/database", "@financeos/backend", "@financeos/ai"],
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
