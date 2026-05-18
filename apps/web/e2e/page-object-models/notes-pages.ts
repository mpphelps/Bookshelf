import { expect, type Page } from "@playwright/test";
import { BaseBookShelvesPage } from "./BaseBookShelvesPage";

export class NotesPage extends BaseBookShelvesPage {
  constructor(page: Page, bookId: string) {
    super(page, `/books/${bookId}/notes`);
  }

  async expectEmptyState() {
    await expect(this.page.getByText("No notes yet.")).toBeVisible();
  }

  async expectNoteContents(contents: string[]) {
    const noteEls = await this.page.getByTestId("note").all();
    const texts = await Promise.all(noteEls.map((el) => el.textContent()));
    expect(texts).toEqual(contents);
  }
}
