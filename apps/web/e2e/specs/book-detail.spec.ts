import { prisma } from "@bookshelf/database";
import { test } from "../test-fixtures";
import { BookDetailPage } from "../page-object-models/book-detail-page";

test.describe("book detail — owner", () => {
  test.use({ user: { email: "test@example.com", name: "Test User" } });

  test("renders details for a book the user owns", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "test@example.com" },
    });
    const book = await prisma.book.create({
      data: { userId: user.id, title: "Dune", author: "Frank Herbert", shelf: "READING" },
    });

    const bookDetailPage = new BookDetailPage(page, book.id);
    await bookDetailPage.goTo();
    await bookDetailPage.expectTitle("Dune");
    await bookDetailPage.expectAuthor("Frank Herbert");
    await bookDetailPage.expectShelf("READING");
  });

  test("shows 404 when the book does not exist", async ({ page }) => {
    const bookDetailPage = new BookDetailPage(page, "nonexistent-id");
    await bookDetailPage.goTo();
    await bookDetailPage.expectErrorMessage("not found");
  });
});

test.describe("book detail — non-owner", () => {
  test.use({ user: { email: "viewer@example.com", name: "Viewer" } });

  test("returns 403 when attempting to view another user's book", async ({ page }) => {
    // Create a SECOND user (the owner) directly via prisma — they never log in.
    const owner = await prisma.user.create({
      data: { email: "owner@example.com", name: "Owner" },
    });
    const book = await prisma.book.create({
      data: { userId: owner.id, title: "Forbidden Book", author: "Owner", shelf: "READING" },
    });

    // The authenticated user (viewer@example.com) tries to access owner's book.
    const bookDetailPage = new BookDetailPage(page, book.id);
    await bookDetailPage.goTo();
    await bookDetailPage.expectErrorMessage("403");
  });
});
