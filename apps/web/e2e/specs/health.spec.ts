import { test, expect } from "../test-fixtures";
import { createOwnerUser } from "../utilities/utilities";

test("health check returns ok status", async ({ page }) => {
  await page.goto("/health");
  await expect(page.getByText("Status: ok")).toBeVisible();
});

test("test DB is empty at the start of every test", async () => {
  const { prisma } = await import("@bookshelf/database");
  expect(await prisma.user.count()).toBe(0);
  expect(await prisma.book.count()).toBe(0);
});

test("inserting data in one test does not leak into the next", async () => {
  const { prisma } = await import("@bookshelf/database");
  createOwnerUser();
  expect(await prisma.user.findUnique({ where: { email: "owner@example.com" } })).not.toBeNull();
  expect(await prisma.user.count()).toBe(1);
});
