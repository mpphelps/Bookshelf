import { prisma } from "@bookshelf/database";
import { ShelvesPage } from "../page-object-models/shelves-page";
import { test } from "../test-fixtures";
import { seedBooksForUser } from "../utilities/utilities";

test.describe("shelves page", () => {
  test.use({ user: { email: "test@example.com", name: "Test User" } });

  test("shows shelf count for the user's books", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "test@example.com" },
    });
    await seedBooksForUser(user.id);

    const shelvesPage = new ShelvesPage(page, "/");
    await shelvesPage.goTo();

    await shelvesPage.expectHeaderNameAndCount("Test User", 6);
    await shelvesPage.expectWantToReadCount(3);
    await shelvesPage.expectReadingCount(2);
    await shelvesPage.expectFinishedCount(1);
    await shelvesPage.expectFooterCount(6);
  });
});
