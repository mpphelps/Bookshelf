import { expect, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class BookDetailPage extends BasePage {
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

  async moveToShelf(shelf: string) {
    await this.page.getByLabel("Move to shelf").selectOption(shelf);
    await this.page.getByRole("button", { name: "Move" }).click();
  }

  async setRating(rating: number) {
    await this.page.getByLabel("Rating", { exact: true }).selectOption(String(rating));
    await this.page.getByRole("button", { name: "Save Rating" }).click();
  }

  async expectShelfHeading(shelf: string) {
    await expect(this.page.getByRole("heading", { level: 2, name: `Shelf: ${shelf}` })).toBeVisible();
  }

  async expectRatingSectionVisible() {
    await expect(this.page.getByRole("heading", { level: 2, name: "Rating" })).toBeVisible();
  }

  async expectRatingSectionHidden() {
    await expect(this.page.getByRole("heading", { level: 2, name: "Rating" })).not.toBeVisible();
  }

  async expectCurrentRating(rating: number) {
    await expect(this.page.getByText(`Current: ${rating}/5`)).toBeVisible();
  }

  async expectNoNotes() {
    await expect(this.page.getByText("No notes yet.")).toBeVisible();
  }

  async expectNoteContents(contents: string[]) {
    await expect(this.page.getByTestId("note")).toHaveText(contents);
  }

  async deleteBook() {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.page.getByRole("button", { name: "Delete book" }).click();
  }

  async deleteNoteAtSlot(slot: string) {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.page.getByRole("button", { name: `Delete note ${slot}` }).click();
  }
}
