import { Form, redirect } from "react-router";
import { getAuthenticatedUser } from "~/services/auth.service";
import { Input } from "@bookshelf/ui/components/input";
import { Button } from "@bookshelf/ui/components/button";
import { createBook } from "~/services/book.service";
import { ValidationError } from "~/lib/errors";
import type { Route } from "./+types/new";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return redirect("/auth/login");
  }
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return redirect("/auth/login");
  }

  const formData = await request.formData();
  const input = {
    title: formData.get("title")?.toString() ?? "",
    author: formData.get("author")?.toString() ?? "",
    shelf: formData.get("shelf")?.toString() ?? "",
  };

  try {
    const book = await createBook(user, input);
    return redirect(`/shelves/${book.shelf.toLowerCase()}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return { errors: error.fields, values: input };
    }
    throw error;
  }
}

export default function NewBook({ actionData }: Route.ComponentProps) {
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <main>
      <h1>Add a book</h1>
      <Form method="post">
        <label>
          Title
          <Input name="title" defaultValue={values?.title} aria-invalid={!!errors?.title} required />
          {errors?.title && <p role="alert">{errors.title}</p>}
        </label>
        <label>
          Author
          <Input name="author" defaultValue={values?.author} aria-invalid={!!errors?.author} required />
          {errors?.author && <p role="alert">{errors.author}</p>}
        </label>
        <label>
          Shelf
          <select name="shelf" defaultValue={values?.shelf ?? "WANT_TO_READ"} aria-invalid={!!errors?.shelf} required>
            <option value="WANT_TO_READ">Want to Read</option>
            <option value="READING">Reading</option>
            <option value="FINISHED">Finished</option>
          </select>
          {errors?.shelf && <p role="alert">{errors.shelf}</p>}
        </label>
        <Button type="submit">Add Book</Button>
      </Form>
    </main>
  );
}
