import { expect } from "@playwright/test";
import { test } from "../test-fixtures";
import { createOwnerUser, createBook } from "../utilities/utilities";

test.describe("admin — admin user", () => {
  test.use({
    user: {
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "Operator",
      permissions: ["read:books", "write:books", "read:notes", "write:notes", "read:admin"],
    },
  });

  test("lists all users with shelf stats", async ({ page }) => {
    const owner = await createOwnerUser({ email: "owner@example.com", firstName: "Owner", lastName: "User" });
    await createBook(owner.id, { shelf: "WANT_TO_READ" });
    await createBook(owner.id, { shelf: "READING" });
    await createBook(owner.id, { shelf: "FINISHED" });

    await page.goto("/admin");

    await expect(page.getByTestId("admin-user-email").filter({ hasText: "admin@example.com" })).toBeVisible();
    await expect(page.getByTestId("admin-user-email").filter({ hasText: "owner@example.com" })).toBeVisible();

    const ownerRow = page.locator("li").filter({ has: page.getByTestId("admin-user-email").filter({ hasText: "owner@example.com" }) });
    await expect(ownerRow).toContainText("3 vols");
    await expect(ownerRow).toContainText("1 queued");
    await expect(ownerRow).toContainText("1 active");
    await expect(ownerRow).toContainText("1 archived");
  });

  test("shows ADMIN link in the system header on the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "ADMIN", exact: true })).toBeVisible();
  });
});

test.describe("admin — non-admin user", () => {
  test.use({
    user: {
      email: "regular@example.com",
      firstName: "Regular",
      lastName: "User",
    },
  });

  test("gets 403 when navigating to /admin", async ({ page }) => {
    await page.goto("/admin");
    const alert = await page.getByRole("alert");
    await expect(alert).toContainText("403");
  });

  test("does not show the ADMIN link in the system header", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "ADMIN", exact: true })).toHaveCount(0);
  });
});

test.describe("admin — unauthenticated", () => {
  test("redirects to login", async ({ page }) => {
    const response = await page.request.get("/admin", { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers()["location"]).toContain("/auth/login");
  });
});
