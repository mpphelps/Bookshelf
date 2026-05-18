import { expect, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class NewBookPage extends BasePage {
  constructor(page: Page) {
    super(page, "/books/new");
  }

  async fillTitle(title: string) {
    await this.page.getByLabel("Title").fill(title);
  }

  async fillAuthor(author: string) {
    await this.page.getByLabel("Author").fill(author);
  }

  async selectShelf(shelf: string) {
    await this.page.getByLabel("Shelf").selectOption(shelf);
  }

  async fillForm(book: { title?: string; author?: string; shelf?: string }) {
    if (book.title !== undefined) await this.fillTitle(book.title);
    if (book.author !== undefined) await this.fillAuthor(book.author);
    if (book.shelf !== undefined) await this.selectShelf(book.shelf);
  }

  async submit() {
    await this.page.getByRole("button", { name: "Add Book" }).click();
  }

  async disableClientValidation() {
    await this.page.evaluate(() => {
      document.querySelectorAll("[required]").forEach((el) => el.removeAttribute("required"));
    });
  }

  async submitWithoutClientValidation() {
    await this.disableClientValidation();
    await this.submit();
  }

  async expectTitleValue(value: string) {
    await expect(this.page.getByLabel("Title")).toHaveValue(value);
  }

  async expectAuthorValue(value: string) {
    await expect(this.page.getByLabel("Author")).toHaveValue(value);
  }

  async expectFieldError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  async expectStillOnNewBookPage() {
    await expect(this.page).toHaveURL(/\/books\/new$/);
  }

  async expectRedirectedToShelf(shelf: string) {
    await this.page.waitForURL(new RegExp(`/shelves/${shelf.toLowerCase()}$`));
  }
}
