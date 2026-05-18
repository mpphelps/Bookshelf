import { isRouteErrorResponse, Link, redirect } from "react-router";
import { BookNotFoundError, ForbiddenError } from "~/lib/errors";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { listNotesForBook } from "~/services/note.service.server";
import type { Route } from "./+types/index";
import { Button } from "@bookshelf/ui/components/button";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");

  try {
    const { book, notes } = await listNotesForBook(user, params.bookId);
    return { user, book, notes };
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

export default function NotesListRoute({ loaderData }: Route.ComponentProps) {
  const { book, notes } = loaderData;

  return (
    <main>
      <h1>Notes — {book.title}</h1>
      <Button asChild>
        <Link to={`/books/${book.id}/notes/new`}>+ Add note</Link>
      </Button>

      {notes.length === 0 ? (
        <p>No notes yet.</p>
      ) : (
        <ul>
          {notes.map((note) => (
            <li key={note.id} data-testid="note">
              {note.content}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
