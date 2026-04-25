import { Link, redirect } from "react-router";
import type { Route } from "./+types/shelves";
import { getAuthenticatedUser } from "../services/auth.service";
import { getShelvesOverview } from "../services/book.service";
import { Button } from "@bookshelf/ui/components/button";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return redirect("/auth/login");
  }

  const shelves = await getShelvesOverview(user);
  return { user, shelves };
}

const SHELF_STATUS: Record<
  string,
  { label: string; tone: "primary" | "accent" | "muted"; pulsing: boolean }
> = {
  WANT_TO_READ: { label: "QUEUED", tone: "muted", pulsing: false },
  READING: { label: "ACTIVE", tone: "primary", pulsing: true },
  FINISHED: { label: "ARCHIVED", tone: "accent", pulsing: false },
};

function formatCount(n: number) {
  return n.toString().padStart(3, "0");
}

function timestamp() {
  const d = new Date();
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}/${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}Z`;
}

export default function Shelves({ loaderData }: Route.ComponentProps) {
  const { user, shelves } = loaderData;
  const total = shelves.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="relative z-[2] min-h-screen">
      {/* TOP BAR — system header */}
      <header className="border-b border-border/80 bg-background/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-xs">
          <div className="flex items-center gap-6">
            <span className="display text-foreground tracking-[0.2em]">
              BOOKSHELF
            </span>
            <span className="text-muted-foreground hidden md:inline">
              <span className="text-primary">/</span> MISSION_LOG
            </span>
            <span className="micro-label hidden md:inline">
              v0.1.0 · sector-7
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-muted-foreground hidden sm:flex items-center gap-2">
              <span
                className="status-dot is-pulsing text-accent"
                aria-hidden
              />
              <span className="micro-label !text-foreground/80">link ok</span>
            </span>
            <span className="micro-label">
              op: <span className="text-foreground">{user.name}</span>
            </span>
            <Button variant="ghost" size="sm" asChild>
              <a href="/auth/logout" className="display !text-[10px]">
                disconnect
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* TELEMETRY HEADER */}
        <section className="mb-12 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-8">
            <p className="micro-label mb-3">
              <span className="text-primary">▸</span> personal library terminal
            </p>
            <h1 className="display text-3xl md:text-4xl text-foreground leading-[1.1]">
              Greetings, {user.name.split(" ")[0]}.
              <br />
              <span className="text-primary">
                {formatCount(total)}
              </span>{" "}
              <span className="text-muted-foreground text-2xl md:text-3xl">
                volumes on record.
              </span>
            </h1>
          </div>

          <div className="col-span-12 md:col-span-4 md:text-right space-y-1">
            <div className="micro-label">timestamp / utc</div>
            <div className="font-mono text-sm text-foreground tabular-nums">
              {timestamp()}
            </div>
            <div className="micro-label pt-2">database integrity</div>
            <div className="font-mono text-sm text-accent flex md:justify-end items-center gap-2">
              <span className="status-dot text-accent" aria-hidden /> NOMINAL
            </div>
          </div>
        </section>

        {/* DIVIDER */}
        <div className="mb-10 flex items-center gap-3 text-muted-foreground">
          <span className="micro-label !text-primary">[ shelves ]</span>
          <span className="h-px flex-1 bg-border" />
          <span className="micro-label">{shelves.length} categories</span>
        </div>

        {/* SHELF PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shelves.map((shelf, idx) => {
            const meta = SHELF_STATUS[shelf.key] ?? SHELF_STATUS.WANT_TO_READ;
            const toneClass =
              meta.tone === "primary"
                ? "text-primary"
                : meta.tone === "accent"
                  ? "text-accent"
                  : "text-muted-foreground";

            return (
              <Link
                key={shelf.key}
                to={`/shelves/${shelf.key}`}
                className="group panel-brackets block bg-card/60 hover:bg-card transition-all duration-300 border border-border/60 hover:border-primary/50 hover:shadow-[0_0_24px_-4px_oklch(0.80_0.16_75/0.35),inset_0_0_0_1px_oklch(0.80_0.16_75/0.15)] p-6"
              >
                {/* slot ID + status */}
                <div className="flex items-center justify-between mb-8">
                  <span className="micro-label">
                    SLOT_{(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <span
                    className={`flex items-center gap-2 micro-label ${toneClass}`}
                  >
                    <span
                      className={`status-dot ${meta.pulsing ? "is-pulsing" : ""}`}
                      aria-hidden
                    />
                    {meta.label}
                  </span>
                </div>

                {/* shelf name */}
                <h2 className="display text-base md:text-lg text-foreground mb-6 leading-tight">
                  {shelf.label}
                </h2>

                {/* count readout */}
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="font-mono text-5xl md:text-6xl font-light text-primary tabular-nums leading-none">
                    {formatCount(shelf.count)}
                  </span>
                  <span className="micro-label">vols</span>
                </div>

                {/* footer action */}
                <div className="flex items-center justify-between text-xs pt-4 border-t border-border/50">
                  <span className="micro-label group-hover:text-primary transition-colors">
                    open log
                  </span>
                  <span className="text-primary font-mono group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* FOOTER STRIP */}
        <footer className="mt-16 pt-6 border-t border-border/60 flex items-center justify-between micro-label">
          <span>
            <span className="text-primary">◆</span> end_of_transmission
          </span>
          <span>
            ─── deep-space archives ────────────────────────────────────────
          </span>
          <span>{formatCount(total)}/∞ stored</span>
        </footer>
      </main>
    </div>
  );
}
