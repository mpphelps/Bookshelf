import type { Page } from "@playwright/test";

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
}
