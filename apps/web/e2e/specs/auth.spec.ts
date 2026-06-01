import { test, expect } from "../test-fixtures";

test.describe("authentication", () => {
  test.use({ user: { email: "test@example.com", name: "Test User", firstName: "Test", lastName: "User" } });

  test("allows logging in with test credentials", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Greetings, Test")).toBeVisible();
  });

  test("creates a user in the database when logging in with test credentials", async ({ page }) => {
    await page.goto("/");
    const { prisma } = await import("@bookshelf/database");
    const user = await prisma.user.findUnique({ where: { email: "test@example.com" } });
    await expect(user).not.toBeNull();
  });
});
