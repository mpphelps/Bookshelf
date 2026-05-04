import { Link } from "react-router";

import { DisplayHeading } from "@bookshelf/ui/components/display-heading";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { Panel } from "@bookshelf/ui/components/panel";
import { StatusIndicator } from "@bookshelf/ui/components/status-indicator";

import { formatCount } from "../../lib/format";

export type ShelfStatusTone = "primary" | "accent" | "muted";

type ShelfCardProps = {
  to: string;
  slotIndex: number;
  shelfLabel: string;
  count: number;
  statusLabel: string;
  statusTone: ShelfStatusTone;
  pulsing?: boolean;
};

export function ShelfCard({
  to,
  slotIndex,
  shelfLabel,
  count,
  statusLabel,
  statusTone,
  pulsing = false,
}: ShelfCardProps) {
  return (
    <Panel asChild interactive surface="card" padding="md" className="group">
      <Link to={to}>
        <div className="flex items-center justify-between mb-8">
          <MicroLabel>
            SLOT_{slotIndex.toString().padStart(2, "0")}
          </MicroLabel>
          <StatusIndicator tone={statusTone} pulsing={pulsing}>
            <MicroLabel
              tone={
                statusTone === "primary"
                  ? "primary"
                  : statusTone === "accent"
                    ? "accent"
                    : "default"
              }
            >
              {statusLabel}
            </MicroLabel>
          </StatusIndicator>
        </div>

        <DisplayHeading
          as="h2"
          className="text-base md:text-lg text-foreground mb-6 leading-tight"
        >
          {shelfLabel}
        </DisplayHeading>

        <div className="flex items-baseline gap-3 mb-8">
          <span
            className="font-mono text-5xl md:text-6xl font-light text-primary tabular-nums leading-none"
            aria-label={`${count} books`}
          >
            {formatCount(count)}
          </span>
          <MicroLabel>vols</MicroLabel>
        </div>

        <div className="flex items-center justify-between text-xs pt-4 border-t border-border/50">
          <MicroLabel className="group-hover:!text-primary transition-colors">
            open log
          </MicroLabel>
          <span className="text-primary font-mono group-hover:translate-x-1 transition-transform">
            →
          </span>
        </div>
      </Link>
    </Panel>
  );
}
