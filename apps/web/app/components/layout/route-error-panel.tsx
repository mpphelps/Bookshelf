import * as React from "react";
import { Link } from "react-router";

import { Button } from "@bookshelf/ui/components/button";
import { DisplayHeading } from "@bookshelf/ui/components/display-heading";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { Panel } from "@bookshelf/ui/components/panel";

type RouteErrorPanelProps = {
  microLabel: React.ReactNode;
  status: number;
  message: string;
  description: React.ReactNode;
  returnTo?: { to: string; label: string };
};

export function RouteErrorPanel({
  microLabel,
  status,
  message,
  description,
  returnTo = { to: "/", label: "← return to mission_log" },
}: RouteErrorPanelProps) {
  return (
    <div className="relative z-[2] min-h-screen">
      <main className="mx-auto max-w-3xl px-6 py-24">
        <Panel padding="lg" surface="card" role="alert">
          <MicroLabel tone="primary" className="mb-4 block">
            ▸ {microLabel}
          </MicroLabel>
          <DisplayHeading
            as="h1"
            className="mb-3 text-2xl text-foreground leading-[1.1]"
          >
            {status} · {message}
          </DisplayHeading>
          <p className="font-mono text-xs text-muted-foreground">{description}</p>
          <div className="mt-6">
            <Button variant="outline" size="sm" asChild>
              <Link to={returnTo.to} className="display !text-[10px]">
                {returnTo.label}
              </Link>
            </Button>
          </div>
        </Panel>
      </main>
    </div>
  );
}
