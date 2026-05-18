import { getAuthenticatedUser } from "~/services/auth.service.server";
import type { Route } from "./+types/$bookId";
import { Form, isRouteErrorResponse, redirect } from "react-router";
import { getBookForUser, rateBook, updateBook } from "~/services/book.service.server";
import { BookNotFoundError, ForbiddenError, ValidationError } from "~/lib/errors";
import { Button } from "@bookshelf/ui/components/button";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return redirect("/auth/login");
  }

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
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "move-shelf") {
      const shelf = String(formData.get("shelf") ?? "");
      await updateBook(user, params.bookId, { shelf });
      return { ok: true };
    }
    if (intent === "rate-book") {
      const rating = Number(formData.get("rating") ?? "");
      await rateBook(user, params.bookId, rating);
      return { ok: true };
    }

    return { errors: { intent: "Invalid intent" } };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { errors: error.fields };
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

export default function BookDetailRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { book } = loaderData;
  const errors = actionData?.errors;

  return (
    <main>
      <h1>{book.title}</h1>
      <p>by {book.author}</p>

      <section>
        <h2>Shelf: {book.shelf}</h2>
        <Form method="post">
          <input type="hidden" name="intent" value="move-shelf" />
          <label>
            Move to shelf
            <select name="shelf" defaultValue={book.shelf} required>
              <option value="WANT_TO_READ">Want to Read</option>
              <option value="READING">Reading</option>
              <option value="FINISHED">Finished</option>
            </select>
          </label>
          <Button type="submit">Move</Button>
          {errors?.shelf && <p role="alert">{errors.shelf}</p>}
        </Form>
      </section>

      {book.shelf === "FINISHED" && (
        <section>
          <h2>Rating</h2>
          {book.rating !== null && <p>Current: {book.rating}/5</p>}
          <Form method="post">
            <input type="hidden" name="intent" value="rate-book" />
            <label htmlFor="rating">Rating</label>
            <select name="rating" id="rating" defaultValue={book.rating ?? 5} required>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <Button type="submit">Save Rating</Button>
            {errors?.rating && <p role="alert">{errors.rating}</p>}
          </Form>
        </section>
      )}
    </main>
  );
}
