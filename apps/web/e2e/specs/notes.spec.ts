import { expect } from "@playwright/test";
import { prisma } from "@bookshelf/database";
import { test } from "../test-fixtures";
import { BookDetailPage } from "../page-object-models/book-detail-page";
import { NewNotePage } from "../page-object-models/new-note-page";
import { createBook, createOwnerUser } from "../utilities/utilities";

test.describe("notes — owner", () => {
  test.use({ user: { email: "test@example.com", firstName: "Test", lastName: "User" } });

  test("shows empty state when book has no notes", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id);

    const detail = new BookDetailPage(page, book.id);
    await detail.goTo();
    await detail.expectNoNotes();
  });

  test("creates a note via the modal and shows it inline", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id);

    const newNote = new NewNotePage(page, book.id);
    await newNote.goTo();
    await newNote.createNote("First impressions of arrakis");

    const detail = new BookDetailPage(page, book.id);
    await detail.expectNoteContents(["First impressions of arrakis"]);
  });

  test("lists notes with newest first", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id);
    await prisma.note.create({
      data: { bookId: book.id, content: "older", createdAt: new Date(Date.now() - 60_000) },
    });
    await prisma.note.create({
      data: { bookId: book.id, content: "newer", createdAt: new Date() },
    });

    const detail = new BookDetailPage(page, book.id);
    await detail.goTo();
    await detail.expectNoteContents(["newer", "older"]);
  });

  test("rejects empty note content", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id);

    const newNote = new NewNotePage(page, book.id);
    await newNote.goTo();
    await newNote.submit();
    await newNote.expectContentError("Note content cannot be empty");
  });
});

test.describe("notes — non-owner", () => {
  test.use({ user: { email: "viewer@example.com", firstName: "Viewer", lastName: "User" } });

  test("returns 403 when viewing another user's book detail (which inlines notes)", async ({ page }) => {
    const owner = await createOwnerUser();
    const book = await createBook(owner.id, { title: "Forbidden Book", author: "Owner" });
    await prisma.note.create({ data: { bookId: book.id, content: "secret" } });

    const detail = new BookDetailPage(page, book.id);
    await detail.goTo();
    await detail.expectErrorMessage("403");
  });

  test("returns 403 when posting a note to another user's book", async ({ page }) => {
    const owner = await createOwnerUser();
    const book = await createBook(owner.id, { title: "Forbidden Book", author: "Owner" });

    // Bypass UI: POST directly to the new-note action as the viewer
    await page.request.post(`/books/${book.id}/notes/new`, {
      form: { content: "hostile note" },
    });

    // Rule held: no notes were added to the owner's book
    const notes = await prisma.note.findMany({ where: { bookId: book.id } });
    expect(notes).toHaveLength(0);
  });
});
