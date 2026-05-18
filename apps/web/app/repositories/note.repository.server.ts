import { prisma } from "@bookshelf/database";

export const noteRepository = {
  async findByBookId(bookId: string) {
    return prisma.note.findMany({
      where: { bookId },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: { bookId: string; content: string }) {
    return prisma.note.create({
      data,
    });
  },
};
