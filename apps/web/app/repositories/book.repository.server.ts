import { prisma } from "@bookshelf/database";
import type { Shelf } from "@bookshelf/database";

export const bookRepository = {
  async countByShelf(userId: string) {
    const counts = await prisma.book.groupBy({
      by: ["shelf"],
      where: { userId },
      _count: true,
    });
    return counts;
  },

  async findByShelf(userId: string, shelf: Shelf) {
    return prisma.book.findMany({
      where: { userId, shelf },
      orderBy: { updatedAt: "desc" },
    });
  },

  async findById(bookId: string) {
    return prisma.book.findUnique({
      where: { id: bookId },
    });
  },

  async create(data: { userId: string; title: string; authors: string[]; shelf: Shelf }) {
    return prisma.book.create({
      data,
    });
  },

  async update(bookId: string, data: { title?: string; authors?: string[]; shelf?: Shelf; rating?: number }) {
    return prisma.book.update({
      where: { id: bookId },
      data,
    });
  },

  async delete(bookId: string) {
    return prisma.book.delete({
      where: { id: bookId },
    });
  },
};
