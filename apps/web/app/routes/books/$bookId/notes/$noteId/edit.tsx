import { isRouteErrorResponse, redirect, useActionData, useParams } from "react-router";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { getNoteForUser, updateNote } from "~/services/note.service.server";
import { ForbiddenError, NoteNotFoundError, ValidationError } from "~/lib/errors";
import type { Route } from "./+types/edit";

import { RouteModal } from "~/components/layout/route-modal";
import { NoteFormModal } from "~/components/books/note-form-modal";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");

  try {
    const note = await getNoteForUser(user, params.noteId);
    return { note };
  } catch (error) {
    if (error instanceof NoteNotFoundError || error instanceof ForbiddenError) {
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
    await updateNote(user, params.noteId, content);
    return redirect(`/books/${params.bookId}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return { errors: error.fields, values: { content } };
    }
    if (error instanceof NoteNotFoundError || error instanceof ForbiddenError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const params = useParams<{ bookId: string }>();
  if (isRouteErrorResponse(error)) {
    return (
      <RouteModal
        returnTo={`/books/${params.bookId ?? ""}`}
        title="Error"
        description={`${error.status} · ${error.data}`}
      >
        <p className="font-mono text-xs text-muted-foreground" role="alert">
          {error.status} · {error.data}
        </p>
      </RouteModal>
    );
  }
  throw error;
}

export default function EditNoteRoute({ loaderData }: Route.ComponentProps) {
  const params = useParams<{ bookId: string }>();
  const actionData = useActionData<typeof action>();

  return (
    <NoteFormModal
      returnTo={`/books/${params.bookId}`}
      title="Edit note"
      description="Revise this log entry."
      submitLabel="Save changes"
      defaultContent={actionData?.values?.content ?? loaderData.note.content}
      errors={actionData?.errors}
    />
  );
}
