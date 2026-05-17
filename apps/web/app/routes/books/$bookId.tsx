import { getAuthenticatedUser } from "~/services/auth.service.server";
import type { Route } from "./+types/$bookId";
import { isRouteErrorResponse, redirect } from "react-router";
import { getBookForUser } from "~/services/book.service.server";
import { BookNotFoundError, ForbiddenError } from "~/lib/errors";
import { SHELF_LABELS } from "~/lib/shelves";

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

export default function BookDetailRoute({ loaderData }: Route.ComponentProps) {
  const { book } = loaderData;
  const bookLabel = SHELF_LABELS[book.shelf as keyof typeof SHELF_LABELS] ?? book.shelf;
  return (
    <main>
      <h1>{book.title}</h1>
      <p>by {book.author}</p>
      <p>Shelf: {bookLabel}</p>
      {book.rating !== null && <p>Rating: {book.rating}/5</p>}
    </main>
  );
}
