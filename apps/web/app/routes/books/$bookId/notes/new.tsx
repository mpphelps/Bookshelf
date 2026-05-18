import { Form, isRouteErrorResponse, redirect, useActionData, useParams } from "react-router";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { createNoteForBook } from "~/services/note.service.server";
import { BookNotFoundError, ForbiddenError, ValidationError } from "~/lib/errors";
import type { Route } from "./+types/new";

import { Button } from "@bookshelf/ui/components/button";
import { Textarea } from "@bookshelf/ui/components/textarea";

import { RouteModal, RouteModalCancel } from "~/components/layout/route-modal";

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
          {error.data}
        </p>
      </RouteModal>
    );
  }
  throw error;
}

export default function NewNoteRoute() {
  const params = useParams<{ bookId: string }>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <RouteModal
      returnTo={`/books/${params.bookId}`}
      title="Add a note"
      description="Capture a thought, quote, or reaction."
    >
      <Form method="post" noValidate className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Note
          <Textarea
            name="content"
            defaultValue={values?.content}
            aria-invalid={!!errors?.content}
            required
          />
          {errors?.content && (
            <p role="alert" className="text-xs text-destructive">{errors.content}</p>
          )}
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <RouteModalCancel />
          <Button type="submit">Save note</Button>
        </div>
      </Form>
    </RouteModal>
  );
}
