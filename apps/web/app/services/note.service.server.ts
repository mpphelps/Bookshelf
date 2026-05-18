import { noteRepository } from "~/repositories/note.repository.server";
import type { AuthUser } from "./auth.service.server";
import { getBookForUser } from "./book.service.server";
import { ValidationError } from "~/lib/errors";

export async function listNotesForBook(user: AuthUser, bookId: string) {
  const book = await getBookForUser(user, bookId);
  const notes = await noteRepository.findByBookId(book.id);
  return { book, notes };
}

export async function createNoteForBook(user: AuthUser, bookId: string, content: string) {
  const book = await getBookForUser(user, bookId);

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new ValidationError({ content: "Note content cannot be empty" });
  }

  return noteRepository.create({
    bookId: book.id,
    content: trimmed,
  });
}
