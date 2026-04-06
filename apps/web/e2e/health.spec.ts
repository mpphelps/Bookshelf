import { test, expect } from "@playwright/test";

test("health check returns ok status", async ({ page }) => {
  await page.goto("/health");
  await expect(page.getByText("Status: ok")).toBeVisible();
  await expect(page.getByText("User Count: 0")).toBeVisible();
});
