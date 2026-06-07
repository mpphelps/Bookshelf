import { Form, Link, Outlet, redirect } from "react-router";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { deleteBook, rateBook, updateBook } from "~/services/book.service.server";
import { deleteNote, listNotesForBook } from "~/services/note.service.server";
import { SHELF_LABELS, type ShelfKey } from "~/lib/shelves";
import { BookNotFoundError, ForbiddenError, NoteNotFoundError, ValidationError } from "~/lib/errors";
import { makeRouteErrorBoundary } from "~/lib/error-boundary";
import type { Route } from "./+types/$bookId";

import { BracketDivider } from "@bookshelf/ui/components/bracket-divider";
import { Button } from "@bookshelf/ui/components/button";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { Panel } from "@bookshelf/ui/components/panel";
import { Select } from "@bookshelf/ui/components/select";
import { StatReadout } from "@bookshelf/ui/components/stat-readout";
import { StatusIndicator } from "@bookshelf/ui/components/status-indicator";

import { SystemHeader } from "~/components/layout/system-header";
import { TransmissionFooter } from "~/components/layout/transmission-footer";
import { BackLink } from "~/components/layout/back-link";
import { ManifestHeader } from "~/components/layout/manifest-header";
import { EmptyTransmission } from "~/components/layout/empty-transmission";
import { LogEntry } from "~/components/books/log-entry";
import { RatingStars } from "~/components/books/rating-stars";
import { formatCount, timestamp } from "~/lib/format";
import { displayName } from "~/lib/name";

type ShelfStatusMeta = {
  label: string;
  tone: "primary" | "accent" | "muted";
  pulsing: boolean;
};

const SHELF_STATUS: Record<ShelfKey, ShelfStatusMeta> = {
  WANT_TO_READ: { label: "QUEUED", tone: "muted", pulsing: false },
  READING: { label: "ACTIVE", tone: "primary", pulsing: true },
  FINISHED: { label: "ARCHIVED", tone: "accent", pulsing: false },
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");

  try {
    const { book, notes } = await listNotesForBook(user, params.bookId);
    return { user, book, notes };
  } catch (error) {
    if (error instanceof BookNotFoundError || error instanceof ForbiddenError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) return redirect("/auth/login");

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "move-shelf") {
      const shelf = String(formData.get("shelf") ?? "");
      await updateBook(user, params.bookId, { shelf });
      return { ok: true };
    }
    if (intent === "rate-book") {
      const rating = Number(formData.get("rating") ?? "");
      await rateBook(user, params.bookId, rating);
      return { ok: true };
    }
    if (intent === "delete-book") {
      const deleted = await deleteBook(user, params.bookId);
      return redirect(`/shelves/${deleted.shelf.toLowerCase()}`);
    }
    if (intent === "delete-note") {
      const noteId = String(formData.get("noteId") ?? "");
      await deleteNote(user, noteId);
      return { ok: true };
    }
    return { errors: { intent: "Invalid intent" } };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { errors: error.fields };
    }
    if (error instanceof BookNotFoundError || error instanceof NoteNotFoundError || error instanceof ForbiddenError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
}

export const ErrorBoundary = makeRouteErrorBoundary({
  microLabel: "record sealed",
  description: "this volume is not accessible from your terminal.",
});

export default function BookDetailRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { user, book, notes } = loaderData;
  const errors = actionData?.errors;

  const shelfKey = book.shelf as ShelfKey;
  const shelfMeta = SHELF_STATUS[shelfKey];
  const shelfLabel = SHELF_LABELS[shelfKey];
  const isFinished = book.shelf === "FINISHED";
  const specimenId = book.id.slice(0, 8).toUpperCase();

  return (
    <div className="relative z-[2] min-h-screen">
      <SystemHeader userName={displayName(user)} section={`VOL / ${specimenId}`} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <BackLink to={`/shelves/${book.shelf.toLowerCase()}`}>{shelfLabel.toUpperCase()} SHELF</BackLink>
        </div>

        <ManifestHeader
          alignAside="start"
          channel={
            <>
              volume manifest / <span className="text-foreground/80">specimen #{specimenId}</span>
            </>
          }
          heading={
            <>
              <span className="block mb-3">{book.title}</span>
              <span className="block font-mono text-sm md:text-base text-muted-foreground">
                by <span className="text-foreground/90">{book.authors.join(", ")}</span>
              </span>
            </>
          }
          aside={
            <>
              <StatReadout label="current shelf">
                <span className="flex md:justify-end items-center gap-2">
                  <StatusIndicator tone={shelfMeta.tone} pulsing={shelfMeta.pulsing}>
                    <MicroLabel tone={shelfMeta.tone === "primary" ? "primary" : shelfMeta.tone === "accent" ? "accent" : "default"}>
                      {shelfMeta.label}
                    </MicroLabel>
                  </StatusIndicator>
                </span>
              </StatReadout>
              <StatReadout label="rating" valueTone={book.rating !== null ? "accent" : "muted"}>
                {book.rating !== null ? <RatingStars rating={book.rating} /> : <span>—</span>}
              </StatReadout>
              <StatReadout label="log entries" valueTone={notes.length > 0 ? "primary" : "muted"}>
                {formatCount(notes.length)}
              </StatReadout>
              <StatReadout label="filed">{timestamp(book.createdAt)}</StatReadout>
            </>
          }
        />

        {/* ─── CONTROL SURFACES ─────────────────────────── */}
        <BracketDivider className="mb-6" label="control surfaces" trailing={timestamp()} />

        <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel padding="md" surface="card">
            <MicroLabel className="mb-3 block">[ shelf control ]</MicroLabel>
            <h2 className="display text-xl md:text-2xl text-foreground mb-5 leading-tight">
              Shelf: <span className="text-primary">{book.shelf}</span>
            </h2>
            <Form method="post" className="flex flex-col gap-2">
              <input type="hidden" name="intent" value="move-shelf" />
              <label htmlFor="move-shelf" className="block">
                <MicroLabel className="block">Move to shelf</MicroLabel>
              </label>
              <div className="flex items-center gap-3">
                <Select id="move-shelf" name="shelf" defaultValue={book.shelf} required size="lg" className="flex-1">
                  <option value="WANT_TO_READ">Want to Read</option>
                  <option value="READING">Reading</option>
                  <option value="FINISHED">Finished</option>
                </Select>
                <Button type="submit" size="sm">
                  Move
                </Button>
              </div>
              {errors?.shelf && (
                <p role="alert" className="font-mono text-xs text-destructive">
                  {errors.shelf}
                </p>
              )}
            </Form>
          </Panel>

          {isFinished ? (
            <Panel padding="md" surface="card">
              <MicroLabel className="mb-3 block">[ rating ]</MicroLabel>
              <h2 className="display text-xl md:text-2xl text-foreground mb-3 leading-tight">Rating</h2>
              {book.rating !== null ? (
                <p className="mb-4 font-mono text-sm text-muted-foreground">
                  Current: <span className="text-accent tabular-nums">{book.rating}/5</span>
                </p>
              ) : (
                <p className="mb-4 font-mono text-xs text-muted-foreground">awaiting first calibration.</p>
              )}
              <Form method="post" className="flex flex-col gap-3">
                <input type="hidden" name="intent" value="rate-book" />
                <label htmlFor="rating" className="sr-only">
                  Rating
                </label>
                <div className="flex items-center gap-3">
                  <Select name="rating" id="rating" defaultValue={book.rating ?? 5} required size="lg" className="flex-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {"★".repeat(n)} ({n})
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" size="sm">
                    Save Rating
                  </Button>
                </div>
                {errors?.rating && (
                  <p role="alert" className="font-mono text-xs text-destructive">
                    {errors.rating}
                  </p>
                )}
              </Form>
            </Panel>
          ) : (
            <Panel padding="md" surface="flat" className="border-dashed">
              <MicroLabel className="mb-3 block">[ rating ]</MicroLabel>
              <p className="font-mono text-sm text-muted-foreground/80 leading-relaxed">
                rating module sealed.
                <br />
                file this volume on the <span className="text-foreground/80">FINISHED</span> shelf to unlock.
              </p>
            </Panel>
          )}
        </div>

        {/* ─── LOG ENTRIES (notes) ─────────────────────────── */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <BracketDivider className="flex-1" label="log entries" trailing={`${formatCount(notes.length)} records`} />
          <Button variant="outline" size="sm" asChild>
            <Link to={`/books/${book.id}/notes/new`} className="display !text-[10px]">
              + Add note
            </Link>
          </Button>
        </div>

        {notes.length === 0 ? (
          <EmptyTransmission art="◌  ── log unwritten ──  ◌" title="No notes yet." subtitle="field observations will appear here." />
        ) : (
          <ol className="grid grid-cols-1 gap-3">
            {notes.map((note, idx) => (
              <li key={note.id}>
                <LogEntry index={idx} bookId={book.id} noteId={note.id} createdAt={note.createdAt} content={note.content} />
              </li>
            ))}
          </ol>
        )}

        {/* ─── DANGER ZONE ─────────────────────────── */}
        <BracketDivider className="mt-12 mb-6" label="danger zone" />

        <Panel padding="md" surface="flat" className="border-destructive/30">
          <MicroLabel tone="default" className="mb-3 block text-destructive/80">
            [ destructive action ]
          </MicroLabel>
          <h2 className="display text-xl md:text-2xl text-foreground mb-2 leading-tight">Decommission volume</h2>
          <p className="mb-5 font-mono text-xs text-muted-foreground/80 leading-relaxed">
            permanently removes this volume and all <span className="text-foreground/80">{formatCount(notes.length)}</span> log{" "}
            {notes.length === 1 ? "entry" : "entries"}. cannot be undone.
          </p>
          <Form
            method="post"
            onSubmit={(event) => {
              if (!confirm(`Delete "${book.title}" and all its notes? This cannot be undone.`)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="delete-book" />
            <Button type="submit" variant="destructive" size="sm">
              Delete book
            </Button>
          </Form>
        </Panel>
      </main>

      <div className="mx-auto max-w-6xl px-6 pb-12">
        <TransmissionFooter total={notes.length} />
      </div>

      <Outlet />
    </div>
  );
}
