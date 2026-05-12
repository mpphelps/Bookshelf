import { expect, type Page } from "@playwright/test";

export abstract class BaseBookShelvesPage {
  readonly page: Page;
  readonly path: string;
  constructor(page: Page, path: string) {
    this.page = page;
    this.path = path;
  }

  async goTo() {
    await this.page.goto(this.path);
  }

  async expectErrorMessage(message: string) {
    await this.page.waitForSelector(`[role="alert"]`);
    const alert = await this.page.getByRole("alert");
    await expect(alert).toContainText(message);
  }

  async expectBookTitles(expectedTitles: string[]) {
    const bookTitleElements = await this.page.getByLabel("book-title").all();
    const bookTitles = await Promise.all(bookTitleElements.map((el) => el.textContent()));
    expectedTitles.forEach((expectedTitle) => {
      expect(bookTitles).toContain(expectedTitle);
    });
  }
}
