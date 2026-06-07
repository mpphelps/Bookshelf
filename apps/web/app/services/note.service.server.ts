import { noteRepository } from "~/repositories/note.repository.server";
import type { AuthUser } from "./auth.service.server";
import { getBookForUser } from "./book.service.server";
import { NoteNotFoundError } from "~/lib/errors";

export async function listNotesForBook(user: AuthUser, bookId: string) {
  const book = await getBookForUser(user, bookId);
  const notes = await noteRepository.findByBookId(book.id);
  return { book, notes };
}

export async function createNoteForBook(user: AuthUser, bookId: string, content: string) {
  const book = await getBookForUser(user, bookId);

  return noteRepository.create({
    bookId: book.id,
    content,
  });
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

  return noteRepository.update(note.id, { content });
}

export async function deleteNote(user: AuthUser, noteId: string) {
  const note = await getNoteForUser(user, noteId);

  await noteRepository.delete(note.id);
  return note;
}
