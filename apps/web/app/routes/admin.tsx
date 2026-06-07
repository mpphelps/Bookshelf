import type { Route } from "./+types/admin";
import type { AuthUser } from "~/services/auth.service.server";
import { withAuth } from "~/lib/with-auth";
import { makeRouteErrorBoundary } from "~/lib/error-boundary";
import { listUsersWithStats } from "~/services/admin.service.server";
import { ForbiddenError } from "~/lib/errors";
import { ADMIN_PERMISSION } from "~/lib/permissions";
import { displayName } from "~/lib/name";

import { BracketDivider } from "@bookshelf/ui/components/bracket-divider";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { Panel } from "@bookshelf/ui/components/panel";

import { SystemHeader } from "~/components/layout/system-header";
import { TransmissionFooter } from "~/components/layout/transmission-footer";
import { ManifestHeader } from "~/components/layout/manifest-header";
import { formatCount, timestamp } from "~/lib/format";

export const meta: Route.MetaFunction = () => [{ title: "Admin — Bookshelf" }];

export const loader = withAuth(async ({ user }: Route.LoaderArgs & { user: AuthUser }) => {
  try {
    const users = await listUsersWithStats(user);
    return { user, users };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
});

export const ErrorBoundary = makeRouteErrorBoundary({
  microLabel: "restricted channel",
  description: "this terminal requires elevated clearance.",
});

export default function AdminRoute({ loaderData }: Route.ComponentProps) {
  const { user, users } = loaderData;
  const isAdmin = user.permissions.includes(ADMIN_PERMISSION);

  return (
    <div className="relative z-[2] min-h-screen">
      <SystemHeader userName={displayName(user)} section="ADMIN_CONSOLE" isAdmin={isAdmin} />

      <main id="main" className="mx-auto max-w-6xl px-6 py-12">
        <ManifestHeader
          channel={<>operations console / <span className="text-foreground/80">user_registry</span></>}
          heading={
            <>
              Operators.
              <br />
              <span className="text-primary tabular-nums">{formatCount(users.length)}</span>{" "}
              <span className="text-muted-foreground text-2xl md:text-3xl">{users.length === 1 ? "account on record." : "accounts on record."}</span>
            </>
          }
        />

        <BracketDivider className="mb-6" label="registry" trailing={`${formatCount(users.length)} records`} />

        {users.length === 0 ? (
          <Panel padding="lg" surface="card" className="text-center">
            <p className="font-mono text-sm text-muted-foreground">no operators on file.</p>
          </Panel>
        ) : (
          <ol className="grid grid-cols-1 gap-3">
            {users.map((u, idx) => {
              const slot = (idx + 1).toString().padStart(3, "0");
              return (
                <li key={u.id}>
                  <Panel padding="md" surface="card">
                    <div className="grid grid-cols-12 items-center gap-4">
                      <div className="col-span-12 md:col-span-1">
                        <MicroLabel className="font-mono">OP_{slot}</MicroLabel>
                      </div>
                      <div className="col-span-12 md:col-span-4 min-w-0">
                        <p className="display text-base md:text-lg text-foreground leading-tight truncate" data-testid="admin-user-name">
                          {u.firstName}
                          {u.lastName ? ` ${u.lastName}` : ""}
                        </p>
                        <p className="mt-1 truncate font-mono text-xs text-muted-foreground" data-testid="admin-user-email">
                          {u.email}
                        </p>
                      </div>
                      <div className="col-span-6 md:col-span-3 font-mono text-xs text-muted-foreground min-w-0">
                        <span aria-hidden="true">▸ </span>
                        <span className="text-foreground/90 tabular-nums">{u.byShelf.WANT_TO_READ}</span> queued
                        {" / "}
                        <span className="text-primary tabular-nums">{u.byShelf.READING}</span> active
                        {" / "}
                        <span className="text-accent tabular-nums">{u.byShelf.FINISHED}</span> archived
                      </div>
                      <div className="col-span-6 md:col-span-2 md:text-right">
                        <MicroLabel className="font-mono" aria-label={`${u.bookCount} books total`}>
                          {formatCount(u.bookCount)} vols
                        </MicroLabel>
                      </div>
                      <div className="col-span-12 md:col-span-2 md:text-right min-w-0">
                        <MicroLabel className="font-mono whitespace-nowrap truncate inline-block max-w-full">
                          {timestamp(u.createdAt)}
                        </MicroLabel>
                      </div>
                    </div>
                  </Panel>
                </li>
              );
            })}
          </ol>
        )}
      </main>

      <div className="mx-auto max-w-6xl px-6 pb-12">
        <TransmissionFooter total={users.length} />
      </div>
    </div>
  );
}
