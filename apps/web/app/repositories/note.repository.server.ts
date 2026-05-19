import { prisma } from "@bookshelf/database";

export const noteRepository = {
  async findByBookId(bookId: string) {
    return prisma.note.findMany({
      where: { bookId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(noteId: string) {
    return prisma.note.findUnique({
      where: { id: noteId },
    });
  },

  async create(data: { bookId: string; content: string }) {
    return prisma.note.create({
      data,
    });
  },

  async update(noteId: string, data: { content: string }) {
    return prisma.note.update({
      where: { id: noteId },
      data,
    });
  },

  async delete(noteId: string) {
    return prisma.note.delete({
      where: { id: noteId },
    });
  },
};
