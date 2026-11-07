// Captures real RevenueOps screens for the demo video.
// Usage: node demo/scripts/capture.mjs [baseUrl]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = process.argv[2] || "http://127.0.0.1:4180";
const out = fileURLToPath(new URL("../public/shots/", import.meta.url));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 2,
});

// Click targets, as fractions of the viewport, for the video's cursor.
const targets = {};
async function target(name, locator) {
  const b = await locator.boundingBox();
  targets[name] = [
    +((b.x + b.width / 2) / 1600).toFixed(4),
    +((b.y + b.height / 2) / 900).toFixed(4),
  ];
}

// Let GSAP entrances and CountUp tweens settle before each capture.
const settle = () => page.waitForTimeout(2600);
const shot = (name, opts = {}) =>
  page.screenshot({ path: `${out}${name}.png`, ...opts });

async function open(hash) {
  await page.goto(`${base}/#${hash}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle();
}

await open("Overview");
await shot("overview");
await page.getByText("Pipeline at a glance").scrollIntoViewIfNeeded();
await page.mouse.wheel(0, 260);
await page.waitForTimeout(1800);
await shot("overview-chart");

await open("Prospects");
await shot("prospects");
await page.mouse.wheel(0, 420);
await page.waitForTimeout(1600);
await shot("prospects-table");
await page.getByLabel("Search prospects").fill("North");
await page.waitForTimeout(600);
await target("search", page.getByLabel("Search prospects"));
await shot("prospects-search");
await page.getByLabel("Search prospects").fill("");
await page.getByRole("button", { name: /^Open / }).first().click();
await page.waitForTimeout(1200);
await shot("prospect-detail");
await page.getByRole("button", { name: "Create outreach draft" }).click();
await page.waitForTimeout(2800);
await shot("draft-created");

await open("Pipeline");
await shot("pipeline");
await page.mouse.wheel(0, 760);
await page.waitForTimeout(1800);
await shot("pipeline-board");
await target("stage", page.getByLabel("Stage for Alder Demo Consulting"));

await open("Drafts");
await shot("drafts");
await page.mouse.wheel(0, 700);
await page.waitForTimeout(1800);
await shot("drafts-editor");
await target("copy", page.getByRole("button", { name: "Copy" }));

await open("Activity");
await shot("activity");

await open("Settings");
await shot("settings");

await page.goto(`${base}/#Overview`);
await page.reload();
await settle();
await page.getByRole("button", { name: /Add prospect/ }).first().click();
await page.waitForTimeout(1200);
await shot("add-prospect");
await target("create", page.getByRole("button", { name: /Create prospect/ }));

await browser.close();
writeFileSync(
  fileURLToPath(new URL("../src/targets.json", import.meta.url)),
  JSON.stringify(targets, null, 2) + "\n",
);
console.log("saved to", out);
