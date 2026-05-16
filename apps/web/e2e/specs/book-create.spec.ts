import { test } from "../test-fixtures";
import { NewBookPage } from "../page-object-models/new-book-page";
import { ShelvesPage } from "../page-object-models/shelves-page";

test.describe("create book", () => {
  test.use({ user: { email: "test@example.com", name: "Test User" } });

  test("creates a book and redirects to its shelf", async ({ page }) => {
    const newBookPage = new NewBookPage(page);
    await newBookPage.goTo();
    await newBookPage.fillForm({ title: "Dune", author: "Frank Herbert", shelf: "READING" });
    await newBookPage.submit();
    await newBookPage.expectRedirectedToShelf("READING");

    const shelvesPage = new ShelvesPage(page, "/shelves/reading");
    await shelvesPage.expectBookTitles(["Dune"]);
  });

  test("shows all errors when the form is empty", async ({ page }) => {
    const newBookPage = new NewBookPage(page);
    await newBookPage.goTo();
    await newBookPage.submitWithoutClientValidation();

    await newBookPage.expectStillOnNewBookPage();
    await newBookPage.expectFieldError("Title is required");
    await newBookPage.expectFieldError("Author is required");
  });

  test("preserves typed values when submission fails", async ({ page }) => {
    const newBookPage = new NewBookPage(page);
    await newBookPage.goTo();
    await newBookPage.fillTitle("Dune");
    await newBookPage.submitWithoutClientValidation();

    await newBookPage.expectFieldError("Author is required");
    await newBookPage.expectTitleValue("Dune");
  });
});
