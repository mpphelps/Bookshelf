import { z } from "zod";
import { SHELF_LABELS, type ShelfKey } from "~/lib/shelves";

const shelfKeys = Object.keys(SHELF_LABELS) as [ShelfKey, ...ShelfKey[]];
export const ShelfSchema = z.enum(shelfKeys);

export const BookCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  author: z.string().trim().min(1, "Author is required"),
  shelf: ShelfSchema,
});
export type BookCreateInput = z.infer<typeof BookCreateSchema>;

export const BookUpdateSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").optional(),
  author: z.string().trim().min(1, "Author cannot be empty").optional(),
  shelf: ShelfSchema.optional(),
});
export type BookUpdateInput = z.infer<typeof BookUpdateSchema>;

export const RatingSchema = z.object({
  rating: z.coerce
    .number()
    .int("Rating must be between 1 and 5")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
});
export type RatingInput = z.infer<typeof RatingSchema>;
