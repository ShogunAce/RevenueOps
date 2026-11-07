import { test, expect } from "@playwright/test";
test("agent changes appear in dashboard and browser edits survive refresh", async ({
  page,
  context,
}) => {
  await context.setExtraHTTPHeaders({
    "X-RevenueOps-Test": crypto.randomUUID(),
  });
  await page.goto("/#Prospects");
  await expect(page.getByText("Shared workspace connected")).toBeVisible();
  const result = await page.evaluate(async () => {
    const r = await fetch("/api/tools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RevenueOps": "browser",
      },
      body: JSON.stringify({
        tool: "create_prospect",
        args: { company: "Shared Integration Prospect" },
      }),
    });
    return r.json();
  });
  expect(result.result.id).toBeTruthy();
  await expect(page.locator("tbody")).toContainText(
    "Shared Integration Prospect",
  );
  await page
    .getByRole("button", { name: "Open Shared Integration Prospect" })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Business problem").fill("Two hours per week");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(page.getByText("Shared workspace connected")).toBeVisible();
  const state = await page.evaluate(async () =>
    (
      await fetch("/api/state", { headers: { "X-RevenueOps": "browser" } })
    ).json(),
  );
  expect(
    state.state.prospects.find((p) => p.id === result.result.id).problem,
  ).toBe("Two hours per week");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("css-revenueops.pre-shared-backup"),
    ),
  ).toBeTruthy();
});
