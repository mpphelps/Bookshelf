import type { Shelf } from "@bookshelf/database";
import { userRepository } from "../repositories/user.repository.server";
import { bookRepository } from "../repositories/book.repository.server";
import { requirePermission, type AuthUser } from "./auth.service.server";
import { ADMIN_PERMISSION } from "~/lib/permissions";

export type UserWithStats = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  createdAt: Date;
  bookCount: number;
  byShelf: Record<Shelf, number>;
};

const EMPTY_SHELF_COUNTS: Record<Shelf, number> = {
  WANT_TO_READ: 0,
  READING: 0,
  FINISHED: 0,
};

export async function listUsersWithStats(admin: AuthUser): Promise<UserWithStats[]> {
  requirePermission(admin, ADMIN_PERMISSION);

  const [users, counts] = await Promise.all([
    userRepository.listAll(),
    bookRepository.countByShelfAcrossUsers(),
  ]);

  const statsByUser = new Map<string, Record<Shelf, number>>();
  for (const row of counts) {
    const existing = statsByUser.get(row.userId) ?? { ...EMPTY_SHELF_COUNTS };
    existing[row.shelf] = row._count;
    statsByUser.set(row.userId, existing);
  }

  return users.map((user) => {
    const byShelf = statsByUser.get(user.id) ?? { ...EMPTY_SHELF_COUNTS };
    const bookCount = byShelf.WANT_TO_READ + byShelf.READING + byShelf.FINISHED;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      bookCount,
      byShelf,
    };
  });
}
