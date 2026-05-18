import { expect, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class NewNotePage extends BasePage {
  constructor(page: Page, bookId: string) {
    super(page, `/books/${bookId}/notes/new`);
  }

  async fillContent(content: string) {
    await this.page.getByLabel("Note", { exact: true }).fill(content);
  }

  async submit() {
    await this.page.getByRole("button", { name: "Save note" }).click();
  }

  async createNote(content: string) {
    await this.fillContent(content);
    await this.submit();
  }

  async expectContentError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
