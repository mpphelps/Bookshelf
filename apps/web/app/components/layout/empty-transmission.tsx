import * as React from "react";

import { Panel } from "@bookshelf/ui/components/panel";

type EmptyTransmissionProps = {
  art?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
};

export function EmptyTransmission({
  art,
  title,
  subtitle,
  action,
}: EmptyTransmissionProps) {
  return (
    <Panel padding="lg" surface="card" className="text-center">
      {art && (
        <pre
          className="mb-6 inline-block text-left font-mono text-[11px] leading-tight text-muted-foreground/60"
          aria-hidden
        >
          {art}
        </pre>
      )}
      <p className="font-mono text-sm text-foreground">{title}</p>
      {subtitle && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">{subtitle}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </Panel>
  );
}
