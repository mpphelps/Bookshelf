import { noteRepository } from "~/repositories/note.repository.server";
import type { AuthUser } from "./auth.service.server";
import { getBookForUser } from "./book.service.server";
import { NoteNotFoundError } from "~/lib/errors";
import { logger } from "~/lib/logger.server";

export async function listNotesForBook(user: AuthUser, bookId: string) {
  const book = await getBookForUser(user, bookId);
  const notes = await noteRepository.findByBookId(book.id);
  return { book, notes };
}

export async function createNoteForBook(user: AuthUser, bookId: string, content: string) {
  const book = await getBookForUser(user, bookId);

  const note = await noteRepository.create({
    bookId: book.id,
    content,
  });
  logger.info({ userId: user.id, bookId: book.id, noteId: note.id, action: "note.create" }, "note created");
  return note;
}

export async function getNoteForUser(user: AuthUser, noteId: string) {
  const note = await noteRepository.findById(noteId);

  if (!note) {
    throw new NoteNotFoundError(noteId);
  }

  await getBookForUser(user, note.bookId);

  return note;
}

export async function updateNote(user: AuthUser, noteId: string, content: string) {
  const note = await getNoteForUser(user, noteId);

  const updated = await noteRepository.update(note.id, { content });
  logger.info({ userId: user.id, noteId: note.id, bookId: note.bookId, action: "note.update" }, "note updated");
  return updated;
}

export async function deleteNote(user: AuthUser, noteId: string) {
  const note = await getNoteForUser(user, noteId);

  await noteRepository.delete(note.id);
  logger.info({ userId: user.id, noteId: note.id, bookId: note.bookId, action: "note.delete" }, "note deleted");
  return note;
}
