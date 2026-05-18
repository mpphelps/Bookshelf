import { isRouteErrorResponse, Link, redirect } from "react-router";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { getBooksOnShelf } from "~/services/book.service.server";
import type { Route } from "./+types/$shelf";
import { ShelfNotFoundError } from "~/lib/errors";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  const shelfKey = params.shelf.toUpperCase();

  if (!user) {
    return redirect("/auth/login");
  }

  try {
    const books = await getBooksOnShelf(user, shelfKey);
    return { user, books, shelfKey };
  } catch (error) {
    if (error instanceof ShelfNotFoundError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error; // unknown errors propagate to RR7's error boundary
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

  throw error; // unknown errors propagate to RR7's root error boundary
}

export default function ShelfRoute({ loaderData }: Route.ComponentProps) {
  const { books, shelfKey } = loaderData;
  return (
    <div>
      <h1>Shelf Details</h1>
      <p>Shelf: {shelfKey}</p>
      <ul>
        {books.map((book) => (
          <li key={book.id} data-testid="book-title">
            <Link to={`/books/${book.id}`}>{book.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
