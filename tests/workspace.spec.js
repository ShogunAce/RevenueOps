import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({
    "X-RevenueOps-Test": crypto.randomUUID(),
  });
});
const nav = (page, name) =>
  page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
test("dashboard totals reflect real records and page has no runtime errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A clearer path to your next client." }),
  ).toBeVisible();
  await expect(page.locator(".metric").first()).toContainText("$57,300");
  await expect(page.locator(".metric").nth(1)).toContainText("$24,355");
  await page.screenshot({
    path: "test-results/overview-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("create, edit, complete follow-up, log activity and persist prospect", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add prospect", exact: true }).click();
  await page
    .getByLabel("Company", { exact: true })
    .fill("Juniper Test Services");
  await page.getByLabel("Contact name").fill("Avery Bennett");
  await page.getByLabel("Opportunity value").fill("3900");
  await page
    .getByLabel("Business problem")
    .fill("Two hours spent reconciling requests.");
  await page
    .getByLabel("Next action", { exact: true })
    .fill("Arrange discovery");
  await page
    .getByRole("button", { name: "Create prospect", exact: true })
    .click();
  await nav(page, "Prospects");
  await page.getByLabel("Search prospects").fill("Juniper");
  await page
    .getByRole("button", { name: "Juniper Test Services Avery Bennett" })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Opportunity value").fill("4500");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Confirmed the revised estimate.");
  await page.getByRole("button", { name: "Log activity" }).click();
  await page.getByRole("button", { name: "Complete follow-up" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Confirmed the revised estimate.",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await page.getByLabel("Search prospects").fill("Juniper");
  await expect(page.locator("tbody")).toContainText("$4,500");
  await expect(page.locator("tbody")).toContainText("No next action");
});
test("stage change updates forecast and survives reload", async ({ page }) => {
  await page.goto("/");
  await nav(page, "Pipeline");
  await page.getByLabel("Stage for Alder Demo Consulting").selectOption("Won");
  await page.reload();
  await expect(page.getByLabel("Stage for Alder Demo Consulting")).toHaveValue(
    "Won",
  );
  await nav(page, "Overview");
  await expect(page.locator(".metric").first()).toContainText("$48,900");
  await expect(page.locator(".metric").nth(2)).toContainText("$15,600");
});
test("drafts use corrected facts, autosave edits and never send", async ({
  page,
}) => {
  const external = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:4173")) external.push(r.url());
  });
  await page.goto("/");
  await nav(page, "Prospects");
  await page
    .getByRole("button", { name: "Open Alder Demo Consulting" })
    .click();
  await page.getByRole("button", { name: "Create outreach draft" }).click();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    /Two hours per week/,
  );
  await page
    .getByLabel("Subject", { exact: true })
    .fill("A more personal subject");
  await nav(page, "Overview");
  await nav(page, "Drafts");
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "A more personal subject",
  );
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await page.reload();
  await expect(page.locator(".draft-editor .badge")).toHaveText("Reviewed");
  await page.getByLabel("Message", { exact: true }).fill("A revised message.");
  await expect(page.locator(".draft-editor .badge")).toHaveText("Draft");
  await expect(page.getByRole("button", { name: /^send/i })).toHaveCount(0);
  expect(external).toEqual([]);
});
test("backup export, restore and sample removal", async ({ page }) => {
  await page.goto("/#Settings");
  await expect(page.getByText("Shared workspace connected")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const path = await (await download).path();
  await page.getByRole("button", { name: "Remove sample data" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await nav(page, "Prospects");
  await expect(
    page.getByRole("heading", { name: "No prospects found" }),
  ).toBeVisible();
  await page.goto("/#Settings");
  await page.locator("input[type=file]").setInputFiles(path);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await nav(page, "Prospects");
  await expect(page.locator("tbody tr")).toHaveCount(8);
});
test("invalid saved state is protected from being overwritten", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("css-revenueops.v1", "broken JSON"),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("saving is paused");
  expect(
    await page.evaluate(() => localStorage.getItem("css-revenueops.v1")),
  ).toBe("broken JSON");
});
test("search empty state and confirmed deletion remove linked data", async ({
  page,
}) => {
  await page.goto("/#Prospects");
  await page.getByLabel("Search prospects").fill("nonexistent");
  await expect(
    page.getByRole("heading", { name: "No prospects found" }),
  ).toBeVisible();
  await page.getByLabel("Search prospects").fill("Alder");
  await page
    .getByRole("button", { name: "Open Alder Demo Consulting" })
    .click();
  await page
    .getByRole("button", { name: "Delete prospect", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Alder Demo Consulting");
  await page
    .getByRole("button", { name: "Delete prospect", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No prospects found" }),
  ).toBeVisible();
});
test("mobile layout stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/overview-mobile.png",
    fullPage: true,
  });
  await nav(page, "Pipeline");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Add prospect", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
});
