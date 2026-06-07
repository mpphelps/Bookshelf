import { z } from "zod";

export const NoteContentSchema = z.object({
  content: z.string().trim().min(1, "Note content cannot be empty"),
});
export type NoteContentInput = z.infer<typeof NoteContentSchema>;
