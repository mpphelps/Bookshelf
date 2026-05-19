import { expect, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class EditNotePage extends BasePage {
  constructor(page: Page, bookId: string, noteId: string) {
    super(page, `/books/${bookId}/notes/${noteId}/edit`);
  }

  async fillContent(content: string) {
    await this.page.getByRole("textbox", { name: "Note" }).fill(content);
  }

  async submit() {
    await this.page.getByRole("button", { name: "Save changes" }).click();
  }

  async editNote(content: string) {
    await this.fillContent(content);
    await this.submit();
  }

  async expectInitialContent(content: string) {
    await expect(this.page.getByRole("textbox", { name: "Note" })).toHaveValue(content);
  }

  async expectContentError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
