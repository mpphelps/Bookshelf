import { expect, type Page } from "@playwright/test";
import { BaseBookShelvesPage } from "./BaseBookShelvesPage";

export class NewNotePage extends BaseBookShelvesPage {
  constructor(page: Page, bookId: string) {
    super(page, `/books/${bookId}/notes/new`);
  }

  async fillContent(content: string) {
    await this.page.getByLabel("Note").fill(content);
  }

  async submit() {
    await this.page.getByRole("button", { name: "Save note" }).click();
  }

  async createNote(content: string) {
    await this.fillContent(content);
    await this.submit();
  }

  async submitWithoutClientValidation() {
    await this.page.evaluate(() => {
      document.querySelectorAll("[required]").forEach((el) => el.removeAttribute("required"));
    });
    await this.submit();
  }

  async expectContentError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
