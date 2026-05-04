import { prisma } from "@bookshelf/database";
import { ShelvesPage } from "../page-object-models/shelves-page";
import { test } from "../test-fixtures";

async function seedBooksForUser(userId: string) {
  await prisma.book.createMany({
    data: [
      { title: "Book 1", author: "Author 1", userId, shelf: "WANT_TO_READ" },
      { title: "Book 2", author: "Author 2", userId, shelf: "WANT_TO_READ" },
      { title: "Book 3", author: "Author 2", userId, shelf: "WANT_TO_READ" },
      { title: "Book 4", author: "Author 2", userId, shelf: "READING" },
      { title: "Book 5", author: "Author 2", userId, shelf: "READING" },
      { title: "Book 6", author: "Author 2", userId, shelf: "FINISHED" },
    ],
  });
}

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
