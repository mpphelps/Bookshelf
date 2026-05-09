import { redirect } from "react-router";
import { getAuthenticatedUser } from "~/services/auth.service";
import { getBooksOnShelf } from "~/services/book.service";
import type { Route } from "./+types/$shelf";
import { ValidationError } from "~/lib/errors";

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
    if (error instanceof ValidationError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error; // unknown errors propagate to RR7's error boundary
  }
}

export default function ShelfRoute({ loaderData }: Route.ComponentProps) {
  const { books, shelfKey } = loaderData;
  return (
    <div>
      <h1>Shelf Details</h1>
      <p>Shelf: {shelfKey}</p>
      <ul>
        {books.map((book) => (
          <li key={book.id}>{book.title}</li>
        ))}
      </ul>
    </div>
  );
}
