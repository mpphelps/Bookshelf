import { redirect, useActionData, useParams } from "react-router";
import type { AuthUser } from "~/services/auth.service.server";
import { getNoteForUser, updateNote } from "~/services/note.service.server";
import { NoteContentSchema } from "~/services/note.schemas";
import { ForbiddenError, NoteNotFoundError } from "~/lib/errors";
import { makeModalErrorBoundary } from "~/lib/error-boundary";
import { withAuth } from "~/lib/with-auth";
import { firstErrorPerField } from "~/lib/zod-errors";
import type { Route } from "./+types/edit";

import { NoteFormModal } from "~/components/books/note-form-modal";

export const meta: Route.MetaFunction = () => [{ title: "Edit note — Bookshelf" }];

export const loader = withAuth(async ({ user, params }: Route.LoaderArgs & { user: AuthUser }) => {
  try {
    const note = await getNoteForUser(user, params.noteId);
    return { note };
  } catch (error) {
    if (error instanceof NoteNotFoundError || error instanceof ForbiddenError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
});

export const action = withAuth(async ({ request, params, user }: Route.ActionArgs & { user: AuthUser }) => {
  const formData = await request.formData();
  const raw = { content: formData.get("content")?.toString() ?? "" };

  const parsed = NoteContentSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: firstErrorPerField(parsed.error), values: raw };
  }

  try {
    await updateNote(user, params.noteId, parsed.data.content);
    return redirect(`/books/${params.bookId}`);
  } catch (error) {
    if (error instanceof NoteNotFoundError || error instanceof ForbiddenError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
});

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
