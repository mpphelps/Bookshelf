import { Form, isRouteErrorResponse, redirect } from "react-router";
import { Button } from "@bookshelf/ui/components/button";
import { Textarea } from "@bookshelf/ui/components/textarea";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { createNoteForBook } from "~/services/note.service.server";
import { getBookForUser } from "~/services/book.service.server";
import { BookNotFoundError, ForbiddenError, ValidationError } from "~/lib/errors";
import type { Route } from "./+types/new";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");

  try {
    const book = await getBookForUser(user, params.bookId);
    return { user, book };
  } catch (error) {
    if (error instanceof BookNotFoundError || error instanceof ForbiddenError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");

  const formData = await request.formData();
  const content = String(formData.get("content") ?? "");

  try {
    await createNoteForBook(user, params.bookId, content);
    return redirect(`/books/${params.bookId}/notes`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return { errors: error.fields, values: { content } };
    }
    if (error instanceof BookNotFoundError || error instanceof ForbiddenError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    return (
      <div role="alert">
        <h1>Error</h1>
        <p>
          {error.status} {error.data}
        </p>
      </div>
    );
  }
  throw error;
}

export default function NewNoteRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { book } = loaderData;
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <main>
      <h1>Add a note — {book.title}</h1>
      <Form method="post">
        <label>
          Note
          <Textarea name="content" defaultValue={values?.content} aria-invalid={!!errors?.content} required />
          {errors?.content && <p role="alert">{errors.content}</p>}
        </label>
        <Button type="submit">Save note</Button>
      </Form>
    </main>
  );
}
