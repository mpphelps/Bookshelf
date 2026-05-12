import { ShelfNotFoundError, ValidationError } from "~/lib/errors";
import { bookRepository } from "../repositories/book.repository";
import type { AuthUser } from "./auth.service";

const SHELF_LABELS = {
  WANT_TO_READ: "Want to Read",
  READING: "Reading",
  FINISHED: "Finished",
} as const;

export type ShelfKey = keyof typeof SHELF_LABELS;

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
    throw new ShelfNotFoundError("Invalid shelf key");
  }

  const books = await bookRepository.findByShelf(user.id, shelf as ShelfKey);
  return books;
}
