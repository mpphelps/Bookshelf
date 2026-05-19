import { Form } from "react-router";

import { Button } from "@bookshelf/ui/components/button";
import { Textarea } from "@bookshelf/ui/components/textarea";

import { RouteModal, RouteModalCancel } from "~/components/layout/route-modal";

type NoteFormModalProps = {
  returnTo: string;
  title: string;
  description: string;
  submitLabel: string;
  defaultContent?: string;
  errors?: { content?: string };
};

export function NoteFormModal({
  returnTo,
  title,
  description,
  submitLabel,
  defaultContent,
  errors,
}: NoteFormModalProps) {
  return (
    <RouteModal returnTo={returnTo} title={title} description={description}>
      <Form method="post" noValidate className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Note
          <Textarea
            name="content"
            defaultValue={defaultContent}
            aria-invalid={!!errors?.content}
            required
          />
          {errors?.content && (
            <p role="alert" className="text-xs text-destructive">{errors.content}</p>
          )}
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <RouteModalCancel />
          <Button type="submit">{submitLabel}</Button>
        </div>
      </Form>
    </RouteModal>
  );
}
