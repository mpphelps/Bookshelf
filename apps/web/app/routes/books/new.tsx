import { Form, isRouteErrorResponse, redirect, useActionData } from "react-router";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { createBook } from "~/services/book.service.server";
import { ValidationError } from "~/lib/errors";
import type { Route } from "./+types/new";

import { Button } from "@bookshelf/ui/components/button";
import { Input } from "@bookshelf/ui/components/input";
import { Select } from "@bookshelf/ui/components/select";

import { RouteModal, RouteModalCancel } from "~/components/layout/route-modal";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");

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
      <RouteModal returnTo="/" title="Error" description={`${error.status} · ${error.data}`}>
        <p className="font-mono text-xs text-muted-foreground" role="alert">
          {error.data}
        </p>
      </RouteModal>
    );
  }
  throw error;
}

export default function NewBook() {
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <RouteModal returnTo="/" title="Add a book" description="New entry for your shelf.">
      <Form method="post" noValidate className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <Input
            name="title"
            defaultValue={values?.title}
            aria-invalid={!!errors?.title}
            required
          />
          {errors?.title && (
            <p role="alert" className="text-xs text-destructive">{errors.title}</p>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Author
          <Input
            name="author"
            defaultValue={values?.author}
            aria-invalid={!!errors?.author}
            required
          />
          {errors?.author && (
            <p role="alert" className="text-xs text-destructive">{errors.author}</p>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Shelf
          <Select
            name="shelf"
            defaultValue={values?.shelf ?? "WANT_TO_READ"}
            aria-invalid={!!errors?.shelf}
            required
          >
            <option value="WANT_TO_READ">Want to Read</option>
            <option value="READING">Reading</option>
            <option value="FINISHED">Finished</option>
          </Select>
          {errors?.shelf && (
            <p role="alert" className="text-xs text-destructive">{errors.shelf}</p>
          )}
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <RouteModalCancel />
          <Button type="submit">Add Book</Button>
        </div>
      </Form>
    </RouteModal>
  );
}
