import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    env: {
      REVENUEOPS_TEST_MODE: "1",
      REVENUEOPS_DATA_DIR: fs.mkdtempSync(
        path.join(os.tmpdir(), "revenue-browser-"),
      ),
    },
    command: "npm run dev -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
