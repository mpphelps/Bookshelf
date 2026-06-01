import { Outlet, redirect } from "react-router";
import type { Route } from "./+types/shelves";

import { BracketDivider } from "@bookshelf/ui/components/bracket-divider";

import { SystemHeader } from "../components/layout/system-header";
import { TransmissionFooter } from "../components/layout/transmission-footer";
import { ShelfCard, type ShelfStatusTone } from "../components/shelves/shelf-card";
import { TelemetryHeader } from "../components/shelves/telemetry-header";
import { getAuthenticatedUser } from "../services/auth.service.server";
import { getShelvesOverview } from "../services/book.service.server";
import { Link } from "react-router";
import { Button } from "@bookshelf/ui/components/button";
import { displayName } from "~/lib/name";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return redirect("/auth/login");
  }

  const shelves = await getShelvesOverview(user);
  return { user, shelves };
}

const SHELF_STATUS: Record<string, { label: string; tone: ShelfStatusTone; pulsing: boolean }> = {
  WANT_TO_READ: { label: "QUEUED", tone: "muted", pulsing: false },
  READING: { label: "ACTIVE", tone: "primary", pulsing: true },
  FINISHED: { label: "ARCHIVED", tone: "accent", pulsing: false },
};

export default function Shelves({ loaderData }: Route.ComponentProps) {
  const { user, shelves } = loaderData;
  const total = shelves.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="relative z-[2] min-h-screen">
      <SystemHeader userName={displayName(user)} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <TelemetryHeader userName={displayName(user)} total={total} />

        {/* <BracketDivider className="mb-10" label="shelves" trailing={`${shelves.length} categories`} /> */}

        <div className="mb-10 flex items-center justify-between gap-4">
          <BracketDivider className="flex-1" label="shelves" trailing={`${shelves.length} categories`} />
          <Button variant="outline" size="sm" asChild>
            <Link to="/books/new" className="display !text-[10px]">
              + NEW ENTRY
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shelves.map((shelf, idx) => {
            const meta = SHELF_STATUS[shelf.key] ?? SHELF_STATUS.WANT_TO_READ;
            return (
              <ShelfCard
                key={shelf.key}
                to={`/shelves/${shelf.key}`}
                slotIndex={idx + 1}
                shelfLabel={shelf.label}
                count={shelf.count}
                statusLabel={meta.label}
                statusTone={meta.tone}
                pulsing={meta.pulsing}
              />
            );
          })}
        </div>
      </main>

      <div className="mx-auto max-w-6xl px-6 pb-12">
        <TransmissionFooter total={total} />
      </div>

      <Outlet />
    </div>
  );
}
