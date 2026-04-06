import { bookRepository } from "../repositories/book.repository";
import type { AuthUser } from "./auth.service";

const SHELF_LABELS = {
  WANT_TO_READ: "Want to Read",
  READING: "Reading",
  FINISHED: "Finished",
} as const;

type ShelfKey = keyof typeof SHELF_LABELS;

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
