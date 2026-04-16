import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@financeos/database", "@financeos/backend", "@financeos/ai"],
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
