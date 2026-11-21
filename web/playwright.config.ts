import { defineConfig } from "@playwright/test";

process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "e2e",
  // The specs change shared data, so they run one at a time on a fresh seed.
  workers: 1,
  globalSetup: "./e2e/seed.ts",
  use: {
    baseURL: "http://localhost:3100",
    // The installed Chrome, so nothing has to be downloaded.
    channel: "chrome",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100/api/v1/health",
    reuseExistingServer: true,
  },
});
