import { Link, isRouteErrorResponse, redirect } from "react-router";
import { getAuthenticatedUser } from "~/services/auth.service.server";
import { getBooksOnShelf } from "~/services/book.service.server";
import { SHELF_LABELS, type ShelfKey } from "~/lib/shelves";
import { ShelfNotFoundError } from "~/lib/errors";
import type { Route } from "./+types/$shelf";

import { BracketDivider } from "@bookshelf/ui/components/bracket-divider";
import { Button } from "@bookshelf/ui/components/button";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { StatReadout } from "@bookshelf/ui/components/stat-readout";
import { StatusIndicator } from "@bookshelf/ui/components/status-indicator";

import { SystemHeader } from "~/components/layout/system-header";
import { TransmissionFooter } from "~/components/layout/transmission-footer";
import { BackLink } from "~/components/layout/back-link";
import { ManifestHeader } from "~/components/layout/manifest-header";
import { EmptyTransmission } from "~/components/layout/empty-transmission";
import { RouteErrorPanel } from "~/components/layout/route-error-panel";
import { BookListItem } from "~/components/books/book-list-item";
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

const EMPTY_ART = `╭───────────────────────────────────╮
                                   
   ◌  NO  TRANSMISSION  RECEIVED   
                                   
╰───────────────────────────────────╯`;

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  const shelfKey = params.shelf.toUpperCase();

  if (!user) {
    return redirect("/auth/login");
  }

  try {
    const books = await getBooksOnShelf(user, shelfKey);
    return { user, books, shelfKey };
  } catch (error) {
    if (error instanceof ShelfNotFoundError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    return (
      <RouteErrorPanel
        microLabel="signal lost"
        status={error.status}
        message={error.data}
        description="the requested channel could not be opened."
      />
    );
  }
  throw error;
}

export default function ShelfRoute({ loaderData }: Route.ComponentProps) {
  const { user, books, shelfKey } = loaderData;
  const key = shelfKey as ShelfKey;
  const isKnownShelf = key in SHELF_LABELS;
  const shelfLabel = isKnownShelf ? SHELF_LABELS[key] : shelfKey;
  const status = isKnownShelf ? SHELF_STATUS[key] : SHELF_STATUS.WANT_TO_READ;
  const channelId = shelfKey.replace(/_/g, "-").toLowerCase();

  return (
    <div className="relative z-[2] min-h-screen">
      <SystemHeader userName={displayName(user)} section={`SHELF_LOG / ${shelfKey}`} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <BackLink to="/">MISSION_LOG</BackLink>
        </div>

        <ManifestHeader
          channel={
            <>
              shelf manifest / <span className="text-foreground/80">ch.{channelId}</span>
            </>
          }
          heading={
            <>
              {shelfLabel}.
              <br />
              <span className="text-primary tabular-nums">{formatCount(books.length)}</span>{" "}
              <span className="text-muted-foreground text-2xl md:text-3xl">{books.length === 1 ? "volume filed." : "volumes filed."}</span>
            </>
          }
          aside={
            <>
              <StatReadout label="status" valueTone={status.tone === "muted" ? "muted" : status.tone}>
                <span className="flex md:justify-end items-center gap-2">
                  <StatusIndicator tone={status.tone} pulsing={status.pulsing}>
                    <MicroLabel tone={status.tone === "primary" ? "primary" : status.tone === "accent" ? "accent" : "default"}>
                      {status.label}
                    </MicroLabel>
                  </StatusIndicator>
                </span>
              </StatReadout>
              <StatReadout label="last scan / utc">{timestamp()}</StatReadout>
            </>
          }
        />

        <div className="mb-6 flex items-center justify-between gap-4">
          <BracketDivider className="flex-1" label="entries" trailing={`${formatCount(books.length)} records`} />
          <Button variant="outline" size="sm" asChild>
            <Link to="/books/new" className="display !text-[10px]">
              + NEW ENTRY
            </Link>
          </Button>
        </div>

        {books.length === 0 ? (
          <EmptyTransmission
            art={EMPTY_ART}
            title={<>the {shelfLabel.toLowerCase()} shelf is empty.</>}
            subtitle="file your first volume to populate this channel."
            action={
              <Button asChild>
                <Link to="/books/new" className="display !text-[10px]">
                  + FILE NEW ENTRY
                </Link>
              </Button>
            }
          />
        ) : (
          <ol className="grid grid-cols-1 gap-3">
            {books.map((book, idx) => (
              <li key={book.id}>
                <BookListItem to={`/books/${book.id}`} slotIndex={idx} title={book.title} authors={book.authors} rating={book.rating} />
              </li>
            ))}
          </ol>
        )}
      </main>

      <div className="mx-auto max-w-6xl px-6 pb-12">
        <TransmissionFooter total={books.length} />
      </div>
    </div>
  );
}
