import { expect } from "@playwright/test";
import { formatCount } from "../../app/lib/format";
import { BasePage } from "./BasePage";

export class ShelvesPage extends BasePage {
  async expectBookTitles(expectedTitles: string[]) {
    for (const title of expectedTitles) {
      await expect(
        this.page.getByTestId("book-title").filter({ hasText: title }),
      ).toBeVisible();
    }
  }

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
    const noun = count === 1 ? "volume" : "volumes";
    await expect(
      this.page.getByRole("link", { name: `Open ${shelfLabel} shelf, ${count} ${noun}`, exact: true }),
    ).toBeVisible();
  }
}
