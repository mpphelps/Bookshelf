export class BookNotFoundError extends Error {
  readonly status = 404;
  constructor(bookId: string) {
    super(`Book with ID ${bookId} not found`);
    this.name = "BookNotFoundError";
  }
}

export class NoteNotFoundError extends Error {
  readonly status = 404;
  constructor(noteId: string) {
    super(`Note with ID ${noteId} not found`);
    this.name = "NoteNotFoundError";
  }
}

export class ShelfNotFoundError extends Error {
  readonly status = 404;
  constructor(shelfKey: string) {
    super(`Shelf '${shelfKey}' not found`);
    this.name = "ShelfNotFoundError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends Error {
  readonly status = 422;
  readonly fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super("Validation failed");
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export function ErrorLookup(status: number): { defaultMicroLabel: string; defaultDescription: string } {
  switch (status) {
    case 404:
      return {
        defaultMicroLabel: "Record Sealed",
        defaultDescription: "This record could not be retrieved.",
      };
    case 403:
      return {
        defaultMicroLabel: "Access Denied",
        defaultDescription: "You do not have permission to access this record.",
      };
    case 422:
      return {
        defaultMicroLabel: "Validation Error",
        defaultDescription: "There were validation errors with your submission.",
      };
    case 500:
      return {
        defaultMicroLabel: "System Fault",
        defaultDescription: "An unexpected error occurred on the system.",
      };
    default:
      return {
        defaultMicroLabel: "Error",
        defaultDescription: "An unexpected error occurred.",
      };
  }
}
