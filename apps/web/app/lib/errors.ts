export class BookNotFoundError extends Error {
  readonly status = 404;
  constructor(bookId: string) {
    super(`Book with ID ${bookId} not found`);
    this.name = "BookNotFoundError";
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
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
