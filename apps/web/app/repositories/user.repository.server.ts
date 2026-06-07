import { prisma } from "@bookshelf/database";

export const userRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async create(data: { email: string; firstName: string; lastName: string | null }) {
    return prisma.user.create({ data });
  },

  async listAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  },
};
