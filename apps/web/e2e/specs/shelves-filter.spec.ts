import { prisma } from "@bookshelf/database";
import { ShelvesPage } from "../page-object-models/shelves-page";
import { test } from "../test-fixtures";
import { seedBooksForUser } from "../utilities/utilities";

test.describe("shelves reading", () => {
  test.use({ user: { email: "test@example.com", name: "Test User", firstName: "Test", lastName: "User" } });

  test("visting invalid routes shows error message", async ({ page }) => {
    const shelvesPage = new ShelvesPage(page, "/shelves/INVALID_SHELF");
    await shelvesPage.goTo();
    await shelvesPage.expectErrorMessage("not found");
  });

  test("shows books to be read on the want to read shelf", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "test@example.com" },
    });
    await seedBooksForUser(user.id);
    const shelvesPage = new ShelvesPage(page, "/shelves/WANT_TO_READ");
    await shelvesPage.goTo();
    await shelvesPage.expectBookTitles(["Book 1", "Book 2", "Book 3"]);
  });

  test("shows books being read on the reading shelf", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "test@example.com" },
    });
    await seedBooksForUser(user.id);
    const shelvesPage = new ShelvesPage(page, "/shelves/READING");
    await shelvesPage.goTo();
    await shelvesPage.expectBookTitles(["Book 4", "Book 5"]);
  });

  test("shows finished books on the finished shelf", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "test@example.com" },
    });
    await seedBooksForUser(user.id);
    const shelvesPage = new ShelvesPage(page, "/shelves/FINISHED");
    await shelvesPage.goTo();
    await shelvesPage.expectBookTitles(["Book 6"]);
  });
});
