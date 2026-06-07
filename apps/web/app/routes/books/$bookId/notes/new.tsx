import { redirect, useActionData, useParams } from "react-router";
import type { AuthUser } from "~/services/auth.service.server";
import { createNoteForBook } from "~/services/note.service.server";
import { NoteContentSchema } from "~/services/note.schemas";
import { BookNotFoundError, ForbiddenError } from "~/lib/errors";
import { makeModalErrorBoundary } from "~/lib/error-boundary";
import { withAuth } from "~/lib/with-auth";
import { firstErrorPerField } from "~/lib/zod-errors";
import type { Route } from "./+types/new";

import { NoteFormModal } from "~/components/books/note-form-modal";

export const meta: Route.MetaFunction = () => [{ title: "Add a note — Bookshelf" }];

export const loader = withAuth(async ({ user }: Route.LoaderArgs & { user: AuthUser }) => {
  return { user };
});

export const action = withAuth(async ({ request, params, user }: Route.ActionArgs & { user: AuthUser }) => {
  const formData = await request.formData();
  const raw = { content: formData.get("content")?.toString() ?? "" };

  const parsed = NoteContentSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: firstErrorPerField(parsed.error), values: raw };
  }

  try {
    await createNoteForBook(user, params.bookId, parsed.data.content);
    return redirect(`/books/${params.bookId}`);
  } catch (error) {
    if (error instanceof BookNotFoundError || error instanceof ForbiddenError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
});

export const ErrorBoundary = makeModalErrorBoundary({
  getReturnTo: (params) => `/books/${params.bookId ?? ""}`,
});

export default function NewNoteRoute() {
  const params = useParams<{ bookId: string }>();
  const actionData = useActionData<typeof action>();

  return (
    <NoteFormModal
      returnTo={`/books/${params.bookId}`}
      title="Add a note"
      description="Capture a thought, quote, or reaction."
      submitLabel="Save note"
      defaultContent={actionData?.values?.content}
      errors={actionData?.errors}
    />
  );
}
