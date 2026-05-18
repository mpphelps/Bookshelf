import { expect } from "@playwright/test";
import { prisma } from "@bookshelf/database";
import { test } from "../test-fixtures";
import { BookDetailPage } from "../page-object-models/book-detail-page";

test.describe("book detail — shelf change & rating", () => {
  test.use({ user: { email: "test@example.com", name: "Test User" } });

  test("moves a book to a different shelf", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await prisma.book.create({
      data: { userId: user.id, title: "Dune", author: "Frank Herbert", shelf: "WANT_TO_READ" },
    });

    const detail = new BookDetailPage(page, book.id);
    await detail.goTo();
    await detail.expectShelfHeading("WANT_TO_READ");
    await detail.moveToShelf("READING");
    await detail.expectShelfHeading("READING");
  });

  test("rating section appears only when the book is finished", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await prisma.book.create({
      data: { userId: user.id, title: "Dune", author: "Frank Herbert", shelf: "READING" },
    });

    const detail = new BookDetailPage(page, book.id);
    await detail.goTo();
    await detail.expectRatingSectionHidden();
    await detail.moveToShelf("FINISHED");
    await detail.expectRatingSectionVisible();
    await detail.moveToShelf("READING");
    await detail.expectRatingSectionHidden();
  });

  test("saves a rating for a finished book", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await prisma.book.create({
      data: { userId: user.id, title: "Dune", author: "Frank Herbert", shelf: "FINISHED" },
    });

    const detail = new BookDetailPage(page, book.id);
    await detail.goTo();
    await detail.setRating(4);
    await detail.expectCurrentRating(4);

    // DB verify — the rating actually persisted, not just rendered
    const updated = await prisma.book.findUniqueOrThrow({ where: { id: book.id } });
    expect(updated.rating).toBe(4);
  });

  test("server rejects rating a non-finished book", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await prisma.book.create({
      data: { userId: user.id, title: "Dune", author: "Frank Herbert", shelf: "READING" },
    });

    // Bypass the hidden UI: POST directly to the action with a rating intent
    await page.request.post(`/books/${book.id}`, {
      form: { intent: "rate-book", rating: "4" },
    });

    // Rule held: rating was NOT applied
    const updated = await prisma.book.findUniqueOrThrow({ where: { id: book.id } });
    expect(updated.rating).toBeNull();
  });
});
