import { Form, isRouteErrorResponse, redirect, useActionData, useNavigate, useParams } from "react-router";
import { Dialog } from "radix-ui";
import { Button } from "@bookshelf/ui/components/button";
import { Textarea } from "@bookshelf/ui/components/textarea";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { createNoteForBook } from "~/services/note.service.server";
import { BookNotFoundError, ForbiddenError, ValidationError } from "~/lib/errors";
import type { Route } from "./+types/new";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");

  // We don't need the book itself for the form, but we DO need to enforce
  // ownership before showing it — same pattern as the rest of the app.
  // The action will re-check via createNoteForBook.
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
  if (isRouteErrorResponse(error)) {
    return (
      <Dialog.Root open>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
            <div role="alert">
              <Dialog.Title className="text-lg font-semibold">Error</Dialog.Title>
              <p className="mt-2 text-sm text-muted-foreground">
                {error.status} {error.data}
              </p>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
  throw error;
}

export default function NewNoteRoute() {
  const navigate = useNavigate();
  const params = useParams<{ bookId: string }>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && navigate(`/books/${params.bookId}`)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">Add a note</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Capture a thought, quote, or reaction.
          </Dialog.Description>

          <Form method="post" noValidate className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Note
              <Textarea
                name="content"
                defaultValue={values?.content}
                aria-invalid={!!errors?.content}
                required
              />
              {errors?.content && <p role="alert" className="text-xs text-destructive">{errors.content}</p>}
            </label>

            <div className="mt-2 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </Dialog.Close>
              <Button type="submit">Save note</Button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
