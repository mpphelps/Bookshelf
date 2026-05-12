import { prisma } from "@bookshelf/database";

export async function seedBooksForUser(userId: string) {
  await prisma.book.createMany({
    data: [
      { title: "Book 1", author: "Author 1", userId, shelf: "WANT_TO_READ" },
      { title: "Book 2", author: "Author 2", userId, shelf: "WANT_TO_READ" },
      { title: "Book 3", author: "Author 2", userId, shelf: "WANT_TO_READ" },
      { title: "Book 4", author: "Author 2", userId, shelf: "READING" },
      { title: "Book 5", author: "Author 2", userId, shelf: "READING" },
      { title: "Book 6", author: "Author 2", userId, shelf: "FINISHED" },
    ],
  });
}
