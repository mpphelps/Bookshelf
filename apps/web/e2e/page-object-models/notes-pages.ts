import { expect, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class NotesPage extends BasePage {
  constructor(page: Page, bookId: string) {
    super(page, `/books/${bookId}/notes`);
  }

  async expectEmptyState() {
    await expect(this.page.getByText("No notes yet.")).toBeVisible();
  }

  async expectNoteContents(contents: string[]) {
    await expect(this.page.getByTestId("note")).toHaveText(contents);
  }
}
