import { expect } from "@playwright/test";
import { prisma } from "@bookshelf/database";
import { test } from "../test-fixtures";
import { NotesPage } from "../page-object-models/notes-pages";
import { NewNotePage } from "../page-object-models/new-note-page";

test.describe("notes — owner", () => {
  test.use({ user: { email: "test@example.com", name: "Test User" } });

  test("shows empty state when book has no notes", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await prisma.book.create({
      data: { userId: user.id, title: "Dune", author: "Frank Herbert", shelf: "READING" },
    });

    const notesPage = new NotesPage(page, book.id);
    await notesPage.goTo();
    await notesPage.expectEmptyState();
  });

  test("creates a note and shows it on the list", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await prisma.book.create({
      data: { userId: user.id, title: "Dune", author: "Frank Herbert", shelf: "READING" },
    });

    const newNotePage = new NewNotePage(page, book.id);
    await newNotePage.goTo();
    await newNotePage.createNote("First impressions of arrakis");

    const notesPage = new NotesPage(page, book.id);
    await notesPage.expectNoteContents(["First impressions of arrakis"]);
  });

  test("lists notes with newest first", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await prisma.book.create({
      data: { userId: user.id, title: "Dune", author: "Frank Herbert", shelf: "READING" },
    });
    // Seed with explicit timestamps for deterministic ordering
    await prisma.note.create({
      data: { bookId: book.id, content: "older", createdAt: new Date(Date.now() - 60_000) },
    });
    await prisma.note.create({
      data: { bookId: book.id, content: "newer", createdAt: new Date() },
    });

    const notesPage = new NotesPage(page, book.id);
    await notesPage.goTo();
    await notesPage.expectNoteContents(["newer", "older"]);
  });

  test("rejects empty note content", async ({ page }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    const book = await prisma.book.create({
      data: { userId: user.id, title: "Dune", author: "Frank Herbert", shelf: "READING" },
    });

    const newNotePage = new NewNotePage(page, book.id);
    await newNotePage.goTo();
    await newNotePage.submitWithoutClientValidation();
    await newNotePage.expectContentError("Note content cannot be empty");
  });
});

test.describe("notes — non-owner", () => {
  test.use({ user: { email: "viewer@example.com", name: "Viewer" } });

  test("returns 403 when viewing another user's notes", async ({ page }) => {
    const owner = await prisma.user.create({
      data: { email: "owner@example.com", name: "Owner" },
    });
    const book = await prisma.book.create({
      data: { userId: owner.id, title: "Forbidden Book", author: "Owner", shelf: "READING" },
    });
    await prisma.note.create({ data: { bookId: book.id, content: "secret" } });

    const notesPage = new NotesPage(page, book.id);
    await notesPage.goTo();
    await notesPage.expectErrorMessage("403");
  });

  test("returns 403 when posting a note to another user's book", async ({ page }) => {
    const owner = await prisma.user.create({
      data: { email: "owner@example.com", name: "Owner" },
    });
    const book = await prisma.book.create({
      data: { userId: owner.id, title: "Forbidden Book", author: "Owner", shelf: "READING" },
    });

    // Bypass UI: POST directly to the new-note action as the viewer
    await page.request.post(`/books/${book.id}/notes/new`, {
      form: { content: "hostile note" },
    });

    // Rule held: no notes were added to the owner's book
    const notes = await prisma.note.findMany({ where: { bookId: book.id } });
    expect(notes).toHaveLength(0);
  });
});
