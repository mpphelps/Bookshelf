import { redirect, useActionData, useParams } from "react-router";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { getNoteForUser, updateNote } from "~/services/note.service.server";
import { ForbiddenError, NoteNotFoundError, ValidationError } from "~/lib/errors";
import { makeModalErrorBoundary } from "~/lib/error-boundary";
import type { Route } from "./+types/edit";

import { NoteFormModal } from "~/components/books/note-form-modal";

export const meta: Route.MetaFunction = () => [{ title: "Edit note — Bookshelf" }];

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

export const ErrorBoundary = makeModalErrorBoundary({
  getReturnTo: (params) => `/books/${params.bookId ?? ""}`,
});

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
