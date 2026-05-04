import { expect } from "@playwright/test";
import { formatCount } from "../../app/lib/format";
import { BaseBookShelvesPage } from "./BaseBookShelvesPage";

export class ShelvesPage extends BaseBookShelvesPage {
  async expectHeaderNameAndCount(userName: string, count: number) {
    const header = this.page.getByRole("heading", { level: 1 });
    const firstName = userName.split(" ")[0];
    await expect(header).toContainText(`Greetings, ${firstName}.`);
    await expect(header).toContainText(`${formatCount(count)} volumes on record.`);
  }

  async expectWantToReadCount(count: number) {
    await this.expectShelfCount("Want to Read", count);
  }

  async expectReadingCount(count: number) {
    await this.expectShelfCount("Reading", count);
  }

  async expectFinishedCount(count: number) {
    await this.expectShelfCount("Finished", count);
  }

  async expectFooterCount(count: number) {
    const footer = this.page.getByRole("contentinfo");
    await expect(footer.getByLabel(`${count} books stored`, { exact: true })).toBeVisible();
  }

  private async expectShelfCount(shelfLabel: string, count: number) {
    const card = this.page.getByRole("link").filter({
      has: this.page.getByRole("heading", { level: 2, name: shelfLabel, exact: true }),
    });
    await expect(card.getByLabel(`${count} books`, { exact: true })).toBeVisible();
  }
}
