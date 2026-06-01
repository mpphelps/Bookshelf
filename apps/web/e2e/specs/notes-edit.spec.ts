import { expect } from "@playwright/test";
import { prisma } from "@bookshelf/database";
import { test } from "../test-fixtures";
import { BookDetailPage } from "../page-object-models/book-detail-page";
import { EditNotePage } from "../page-object-models/edit-note-page";
import { createBook, createOwnerUser } from "../utilities/utilities";

test.describe("notes edit — owner", () => {
  test.use({ user: { email: "test@example.com", firstName: "Test", lastName: "User" } });

  test("pre-fills the form with current content and saves an update", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id);
    const note = await prisma.note.create({
      data: { bookId: book.id, content: "original content" },
    });

    const edit = new EditNotePage(page, book.id, note.id);
    await edit.goTo();
    await edit.expectInitialContent("original content");
    await edit.editNote("revised content");

    await expect(page).toHaveURL(`/books/${book.id}`);

    const detail = new BookDetailPage(page, book.id);
    await detail.expectNoteContents(["revised content"]);

    const updated = await prisma.note.findUniqueOrThrow({ where: { id: note.id } });
    expect(updated.content).toBe("revised content");
  });

  test("rejects empty note content", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id);
    const note = await prisma.note.create({
      data: { bookId: book.id, content: "original content" },
    });

    const edit = new EditNotePage(page, book.id, note.id);
    await edit.goTo();
    await edit.fillContent("");
    await edit.submit();
    await edit.expectContentError("Note content cannot be empty");

    // Original content preserved
    const unchanged = await prisma.note.findUniqueOrThrow({ where: { id: note.id } });
    expect(unchanged.content).toBe("original content");
  });

  test("returns 404 when the note does not exist", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await createBook(user.id);

    const edit = new EditNotePage(page, book.id, "nonexistent-note-id");
    await edit.goTo();
    await edit.expectErrorMessage("404");
  });
});

test.describe("notes edit — non-owner", () => {
  test.use({ user: { email: "viewer@example.com", firstName: "Viewer", lastName: "User" } });

  test("returns 403 when viewing another user's edit-note route", async ({ page }) => {
    const owner = await createOwnerUser();
    const book = await createBook(owner.id, { title: "Forbidden Book", author: "Owner" });
    const note = await prisma.note.create({
      data: { bookId: book.id, content: "owner's secret note" },
    });

    const edit = new EditNotePage(page, book.id, note.id);
    await edit.goTo();
    await edit.expectErrorMessage("403");
  });

  test("server rejects editing another user's note via direct POST", async ({ page }) => {
    const owner = await createOwnerUser();
    const book = await createBook(owner.id, { title: "Forbidden Book", author: "Owner" });
    const note = await prisma.note.create({
      data: { bookId: book.id, content: "original secret" },
    });

    // Bypass UI: POST directly as the viewer
    await page.request.post(`/books/${book.id}/notes/${note.id}/edit`, {
      form: { content: "hostile rewrite" },
    });

    // Rule held: content unchanged
    const unchanged = await prisma.note.findUniqueOrThrow({ where: { id: note.id } });
    expect(unchanged.content).toBe("original secret");
  });
});
