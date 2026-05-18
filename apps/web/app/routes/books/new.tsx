import { Form, isRouteErrorResponse, redirect, useActionData, useNavigate } from "react-router";
import { Dialog } from "radix-ui";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { Input } from "@bookshelf/ui/components/input";
import { Button } from "@bookshelf/ui/components/button";
import { createBook } from "~/services/book.service.server";
import { ValidationError } from "~/lib/errors";
import type { Route } from "./+types/new";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return redirect("/auth/login");
  }
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return redirect("/auth/login");
  }

  const formData = await request.formData();
  const input = {
    title: formData.get("title")?.toString() ?? "",
    author: formData.get("author")?.toString() ?? "",
    shelf: formData.get("shelf")?.toString() ?? "",
  };

  try {
    const book = await createBook(user, input);
    return redirect(`/shelves/${book.shelf.toLowerCase()}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return { errors: error.fields, values: input };
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

export default function NewBook() {
  const navigate = useNavigate();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && navigate("/")}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">Add a book</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            New entry for your shelf.
          </Dialog.Description>

          <Form method="post" noValidate className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Title
              <Input name="title" defaultValue={values?.title} aria-invalid={!!errors?.title} required />
              {errors?.title && <p role="alert" className="text-xs text-destructive">{errors.title}</p>}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Author
              <Input name="author" defaultValue={values?.author} aria-invalid={!!errors?.author} required />
              {errors?.author && <p role="alert" className="text-xs text-destructive">{errors.author}</p>}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Shelf
              <select
                name="shelf"
                defaultValue={values?.shelf ?? "WANT_TO_READ"}
                aria-invalid={!!errors?.shelf}
                required
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="WANT_TO_READ">Want to Read</option>
                <option value="READING">Reading</option>
                <option value="FINISHED">Finished</option>
              </select>
              {errors?.shelf && <p role="alert" className="text-xs text-destructive">{errors.shelf}</p>}
            </label>

            <div className="mt-2 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </Dialog.Close>
              <Button type="submit">Add Book</Button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
