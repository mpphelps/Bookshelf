import { expect, type Page } from "@playwright/test";
import { BaseBookShelvesPage } from "./BaseBookShelvesPage";

export class BookDetailPage extends BaseBookShelvesPage {
  constructor(page: Page, bookId: string) {
    super(page, `/books/${bookId}`);
  }

  async expectTitle(title: string) {
    await expect(this.page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }

  async expectAuthor(author: string) {
    await expect(this.page.getByText(`by ${author}`)).toBeVisible();
  }

  async expectShelf(shelf: string) {
    await expect(this.page.getByText(`Shelf: ${shelf}`)).toBeVisible();
  }

  async expectRating(rating: number) {
    await expect(this.page.getByText(`Rating: ${rating}/5`)).toBeVisible();
  }
}
