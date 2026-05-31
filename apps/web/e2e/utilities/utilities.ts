import { prisma } from "@bookshelf/database";
import type { Shelf } from "@bookshelf/database";

export async function seedBooksForUser(userId: string) {
  await prisma.book.createMany({
    data: [
      { title: "Book 1", author: "Author 1", authors: ["Author 1"], userId, shelf: "WANT_TO_READ" },
      { title: "Book 2", author: "Author 2", authors: ["Author 2"], userId, shelf: "WANT_TO_READ" },
      { title: "Book 3", author: "Author 2", authors: ["Author 2"], userId, shelf: "WANT_TO_READ" },
      { title: "Book 4", author: "Author 2", authors: ["Author 2"], userId, shelf: "READING" },
      { title: "Book 5", author: "Author 2", authors: ["Author 2"], userId, shelf: "READING" },
      { title: "Book 6", author: "Author 2", authors: ["Author 2"], userId, shelf: "FINISHED" },
    ],
  });
}

export type CreateBookOverrides = {
  title?: string;
  author?: string;
  authors?: string[];
  shelf?: Shelf;
  rating?: number | null;
  genre?: string | null;
  isFavorite?: boolean;
};

export async function createBook(userId: string, overrides: CreateBookOverrides = {}) {
  const author = overrides.author ?? "Frank Herbert";
  return prisma.book.create({
    data: {
      userId,
      title: overrides.title ?? "Dune",
      author,
      authors: overrides.authors ?? [author],
      shelf: overrides.shelf ?? "READING",
      rating: overrides.rating ?? null,
      genre: overrides.genre ?? null,
      isFavorite: overrides.isFavorite ?? false,
    },
  });
}
