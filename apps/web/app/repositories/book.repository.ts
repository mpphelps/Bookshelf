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
};
