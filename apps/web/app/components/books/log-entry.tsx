import { Form, Link } from "react-router";

import { Button } from "@bookshelf/ui/components/button";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { Panel } from "@bookshelf/ui/components/panel";

import { timestamp } from "~/lib/format";

type LogEntryProps = {
  index: number;
  bookId: string;
  noteId: string;
  createdAt: Date | string;
  content: string;
};

export function LogEntry({ index, bookId, noteId, createdAt, content }: LogEntryProps) {
  const slot = (index + 1).toString().padStart(3, "0");
  return (
    <Panel padding="md" surface="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <MicroLabel className="font-mono">log_{slot}</MicroLabel>
        <div className="flex items-center gap-2">
          <MicroLabel>{timestamp(createdAt)}</MicroLabel>
          <Button variant="ghost" size="xs" asChild>
            <Link to={`/books/${bookId}/notes/${noteId}/edit`} className="display !text-[10px]">
              Edit
            </Link>
          </Button>
          <Form
            method="post"
            action={`/books/${bookId}`}
            onSubmit={(event) => {
              if (!confirm("Delete this note? This cannot be undone.")) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="delete-note" />
            <input type="hidden" name="noteId" value={noteId} />
            <Button
              type="submit"
              variant="destructive"
              size="xs"
              aria-label={`Delete note ${slot}`}
              className="display !text-[10px]"
            >
              Delete
            </Button>
          </Form>
        </div>
      </div>
      <p
        data-testid="note"
        className="font-mono text-sm text-foreground leading-relaxed whitespace-pre-wrap"
      >
        {content}
      </p>
    </Panel>
  );
}
