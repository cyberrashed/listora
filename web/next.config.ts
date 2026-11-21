import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Every dashboard page reads the staff session and live data at request
    // time, so only routes that opt in are checked for instant navigation.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
