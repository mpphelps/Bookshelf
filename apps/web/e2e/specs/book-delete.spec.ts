import { expect } from "@playwright/test";
import { prisma } from "@bookshelf/database";
import { test } from "../test-fixtures";
import { BookDetailPage } from "../page-object-models/book-detail-page";
import { createBook } from "../utilities/utilities";

test.describe("book delete — owner", () => {
  test.use({ user: { email: "test@example.com", name: "Test User" } });

  test("deletes the book, cascade-removes notes, and redirects to its shelf", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id);
    await prisma.note.createMany({
      data: [
        { bookId: book.id, content: "first note" },
        { bookId: book.id, content: "second note" },
      ],
    });

    const detail = new BookDetailPage(page, book.id);
    await detail.goTo();
    await detail.deleteBook();

    await expect(page).toHaveURL("/shelves/reading");

    const remainingBook = await prisma.book.findUnique({ where: { id: book.id } });
    expect(remainingBook).toBeNull();

    const remainingNotes = await prisma.note.findMany({ where: { bookId: book.id } });
    expect(remainingNotes).toHaveLength(0);
  });

  test("redirects to the correct shelf based on the book's current shelf", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id, { shelf: "FINISHED" });

    const detail = new BookDetailPage(page, book.id);
    await detail.goTo();
    await detail.deleteBook();

    await expect(page).toHaveURL("/shelves/finished");
  });
});

test.describe("book delete — non-owner", () => {
  test.use({ user: { email: "viewer@example.com", name: "Viewer" } });

  test("server rejects deletion of another user's book", async ({ page }) => {
    const owner = await prisma.user.create({
      data: { email: "owner@example.com", name: "Owner" },
    });
    const book = await createBook(owner.id, { title: "Forbidden Book", author: "Owner" });
    await prisma.note.create({ data: { bookId: book.id, content: "secret" } });

    // Bypass UI: POST directly to the action as the viewer
    await page.request.post(`/books/${book.id}`, {
      form: { intent: "delete-book" },
    });

    // Rule held: book + notes still exist
    const remainingBook = await prisma.book.findUnique({ where: { id: book.id } });
    expect(remainingBook).not.toBeNull();

    const remainingNotes = await prisma.note.findMany({ where: { bookId: book.id } });
    expect(remainingNotes).toHaveLength(1);
  });
});
