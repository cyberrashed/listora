import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path("./src"),
      // The real module throws outside a React Server Components build.
      "server-only": path("./node_modules/server-only/empty.js"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // The tests share one database, so files run one at a time.
    fileParallelism: false,
    env: {
      MONGODB_URI: "mongodb://localhost:27017/listora_test?replicaSet=rs0",
      JWT_SECRET: "test-secret-that-is-at-least-32-characters",
      // Signs fake Stripe events in tests. Not a real Stripe secret.
      STRIPE_WEBHOOK_SECRET: "whsec_listora_test_only",
    },
  },
});
