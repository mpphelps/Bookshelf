import { expect } from "@playwright/test";
import { prisma } from "@bookshelf/database";
import { test } from "../test-fixtures";
import { BookDetailPage } from "../page-object-models/book-detail-page";
import { createBook, createOwnerUser } from "../utilities/utilities";

test.describe("notes delete — owner", () => {
  test.use({ user: { email: "test@example.com", firstName: "Test", lastName: "User" } });

  test("removes the note from the book and the database", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id);
    const note = await prisma.note.create({
      data: { bookId: book.id, content: "going to be deleted" },
    });

    const detail = new BookDetailPage(page, book.id);
    await detail.goTo();
    await detail.deleteNoteAtSlot("001");

    await detail.expectNoNotes();

    const remaining = await prisma.note.findUnique({ where: { id: note.id } });
    expect(remaining).toBeNull();
  });

  test("removes only the targeted note when multiple exist", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id);
    await prisma.note.create({
      data: { bookId: book.id, content: "older keeper", createdAt: new Date(Date.now() - 60_000) },
    });
    const newer = await prisma.note.create({
      data: { bookId: book.id, content: "newer doomed", createdAt: new Date() },
    });

    const detail = new BookDetailPage(page, book.id);
    await detail.goTo();
    // log_001 is the newest (orderBy createdAt desc)
    await detail.deleteNoteAtSlot("001");

    await detail.expectNoteContents(["older keeper"]);

    const deletedNote = await prisma.note.findUnique({ where: { id: newer.id } });
    expect(deletedNote).toBeNull();
  });
});

test.describe("notes delete — non-owner", () => {
  test.use({ user: { email: "viewer@example.com", firstName: "Viewer", lastName: "User" } });

  test("server rejects deletion of another user's note via direct POST", async ({ page }) => {
    const owner = await createOwnerUser();
    const book = await createBook(owner.id, { title: "Forbidden Book", author: "Owner" });
    const note = await prisma.note.create({
      data: { bookId: book.id, content: "owner's untouchable note" },
    });

    // Bypass UI: POST as viewer with the owner's noteId
    await page.request.post(`/books/${book.id}`, {
      form: { intent: "delete-note", noteId: note.id },
    });

    // Rule held: note still exists
    const stillThere = await prisma.note.findUnique({ where: { id: note.id } });
    expect(stillThere).not.toBeNull();
  });
});
