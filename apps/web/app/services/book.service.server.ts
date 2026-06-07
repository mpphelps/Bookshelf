import { BookNotFoundError, ForbiddenError, ShelfNotFoundError, ValidationError } from "~/lib/errors";
import { bookRepository } from "../repositories/book.repository.server";
import type { AuthUser } from "./auth.service.server";
import { SHELF_LABELS, type ShelfKey } from "~/lib/shelves";
import { logger } from "~/lib/logger.server";
import type { BookCreateInput, BookUpdateInput } from "./book.schemas";

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

export async function createBook(user: AuthUser, input: BookCreateInput) {
  const book = await bookRepository.create({
    userId: user.id,
    title: input.title,
    authors: [input.author],
    shelf: input.shelf,
  });
  logger.info({ userId: user.id, bookId: book.id, shelf: book.shelf, action: "book.create" }, "book created");
  return book;
}

export async function updateBook(user: AuthUser, bookId: string, input: BookUpdateInput) {
  const book = await getBookForUser(user, bookId);

  const data: { title?: string; authors?: string[]; shelf?: ShelfKey } = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.author !== undefined) data.authors = [input.author];
  if (input.shelf !== undefined) data.shelf = input.shelf;

  if (Object.keys(data).length === 0) {
    return book;
  }

  const updated = await bookRepository.update(book.id, data);
  logger.info({ userId: user.id, bookId: book.id, fields: Object.keys(data), action: "book.update" }, "book updated");
  return updated;
}

export async function deleteBook(user: AuthUser, bookId: string) {
  const book = await getBookForUser(user, bookId);

  await bookRepository.delete(book.id);
  logger.info({ userId: user.id, bookId: book.id, action: "book.delete" }, "book deleted");
  return book;
}

export async function rateBook(user: AuthUser, bookId: string, rating: number) {
  const book = await getBookForUser(user, bookId);

  if (book.shelf !== "FINISHED") {
    logger.warn({ userId: user.id, bookId, shelf: book.shelf, action: "book.rate" }, "rating rejected: not on FINISHED shelf");
    throw new ValidationError({ rating: "Can only rate finished books" });
  }

  const updated = await bookRepository.update(book.id, { rating });
  logger.info({ userId: user.id, bookId, rating, action: "book.rate" }, "book rated");
  return updated;
}
