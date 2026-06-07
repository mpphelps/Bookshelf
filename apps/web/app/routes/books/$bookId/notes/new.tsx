import { redirect, useActionData, useParams } from "react-router";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { createNoteForBook } from "~/services/note.service.server";
import { BookNotFoundError, ForbiddenError, ValidationError } from "~/lib/errors";
import { makeModalErrorBoundary } from "~/lib/error-boundary";
import type { Route } from "./+types/new";

import { NoteFormModal } from "~/components/books/note-form-modal";

export const meta: Route.MetaFunction = () => [{ title: "Add a note — Bookshelf" }];

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");
  return { user };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");

  const formData = await request.formData();
  const content = String(formData.get("content") ?? "");

  try {
    await createNoteForBook(user, params.bookId, content);
    return redirect(`/books/${params.bookId}`);
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
