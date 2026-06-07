import { Form, redirect, useActionData } from "react-router";
import type { AuthUser } from "~/services/auth.service.server";
import { createBook } from "~/services/book.service.server";
import { BookCreateSchema } from "~/services/book.schemas";
import { makeModalErrorBoundary } from "~/lib/error-boundary";
import { firstErrorPerField } from "~/lib/zod-errors";
import type { Route } from "./+types/new";

import { Button } from "@bookshelf/ui/components/button";
import { Input } from "@bookshelf/ui/components/input";
import { Select } from "@bookshelf/ui/components/select";

import { RouteModal, RouteModalCancel } from "~/components/layout/route-modal";
import { withAuth } from "~/lib/with-auth";

export const meta: Route.MetaFunction = () => [{ title: "Add a book — Bookshelf" }];

export const loader = withAuth(async ({ user }: Route.LoaderArgs & { user: AuthUser }) => {
  return { user };
});

export const action = withAuth(async ({ request, user }: Route.ActionArgs & { user: AuthUser }) => {
  const formData = await request.formData();
  const raw = {
    title: formData.get("title")?.toString() ?? "",
    author: formData.get("author")?.toString() ?? "",
    shelf: formData.get("shelf")?.toString() ?? "",
  };

  const parsed = BookCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: firstErrorPerField(parsed.error), values: raw };
  }

  const book = await createBook(user, parsed.data);
  return redirect(`/shelves/${book.shelf.toLowerCase()}`);
});

export const ErrorBoundary = makeModalErrorBoundary({
  getReturnTo: () => "/",
});

export default function NewBook() {
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <RouteModal returnTo="/" title="Add a book" description="New entry for your shelf.">
      <Form method="post" noValidate className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <Input name="title" defaultValue={values?.title} aria-invalid={!!errors?.title} required />
          {errors?.title && (
            <p role="alert" className="text-xs text-destructive">
              {errors.title}
            </p>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Author
          <Input name="author" defaultValue={values?.author} aria-invalid={!!errors?.author} required />
          {errors?.author && (
            <p role="alert" className="text-xs text-destructive">
              {errors.author}
            </p>
          )}
        </label>

        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor="new-book-shelf">Shelf</label>
          <Select
            id="new-book-shelf"
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
            <p role="alert" className="text-xs text-destructive">
              {errors.shelf}
            </p>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <RouteModalCancel />
          <Button type="submit">Add Book</Button>
        </div>
      </Form>
    </RouteModal>
  );
}
