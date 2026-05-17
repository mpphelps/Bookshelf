import { BookNotFoundError, ForbiddenError, ShelfNotFoundError, ValidationError } from "~/lib/errors";
import { bookRepository } from "../repositories/book.repository.server";
import type { AuthUser } from "./auth.service.server";
import { SHELF_LABELS, type ShelfKey } from "~/lib/shelves";

export async function getShelvesOverview(user: AuthUser) {
  const counts = await bookRepository.countByShelf(user.id);

  const shelves: Array<{ key: ShelfKey; label: string; count: number }> = (Object.entries(SHELF_LABELS) as [ShelfKey, string][]).map(
    ([key, label]) => {
      const found = counts.find((c) => c.shelf === key);
      return { key, label, count: found?._count ?? 0 };
    },
  );

  return shelves;
}

export async function getBooksOnShelf(user: AuthUser, shelf: string) {
  if (SHELF_LABELS[shelf as ShelfKey] === undefined) {
    throw new ShelfNotFoundError(shelf);
  }

  const books = await bookRepository.findByShelf(user.id, shelf as ShelfKey);
  return books;
}

export async function getBookForUser(user: AuthUser, bookId: string) {
  const book = await bookRepository.findById(bookId);

  if (!book) {
    throw new BookNotFoundError(bookId);
  }

  if (book.userId !== user.id) {
    throw new ForbiddenError("You do not have access to this book");
  }

  return book;
}

export async function createBook(user: AuthUser, input: { title: string; author: string; shelf: string }) {
  const errors: Record<string, string> = {};

  const title = input.title.trim();
  const author = input.author.trim();

  if (title.length === 0) {
    errors.title = "Title is required";
  }
  if (author.length === 0) {
    errors.author = "Author is required";
  }
  if (SHELF_LABELS[input.shelf as ShelfKey] === undefined) {
    errors.shelf = "Invalid shelf";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return bookRepository.create({
    userId: user.id,
    title,
    author,
    shelf: input.shelf as ShelfKey,
  });
}
