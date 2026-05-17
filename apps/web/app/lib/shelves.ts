export const SHELF_LABELS = {
  WANT_TO_READ: "Want to Read",
  READING: "Reading",
  FINISHED: "Finished",
} as const;

export type ShelfKey = keyof typeof SHELF_LABELS;
