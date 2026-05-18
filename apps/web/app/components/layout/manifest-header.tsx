import * as React from "react";

import { DisplayHeading } from "@bookshelf/ui/components/display-heading";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";

type ManifestHeaderProps = {
  channel: React.ReactNode;
  heading: React.ReactNode;
  aside?: React.ReactNode;
  /** Vertical alignment of the right column relative to the heading */
  alignAside?: "end" | "start";
};

export function ManifestHeader({
  channel,
  heading,
  aside,
  alignAside = "end",
}: ManifestHeaderProps) {
  return (
    <section
      className={`mb-12 grid grid-cols-12 gap-6 ${alignAside === "end" ? "items-end" : "items-start"}`}
    >
      <div className={`col-span-12 ${aside ? "md:col-span-8" : "md:col-span-12"}`}>
        <MicroLabel className="mb-3 block">
          <span className="text-primary">▸</span> {channel}
        </MicroLabel>
        <DisplayHeading
          as="h1"
          className="text-3xl md:text-5xl text-foreground leading-[1.05]"
        >
          {heading}
        </DisplayHeading>
      </div>
      {aside && (
        <div className="col-span-12 md:col-span-4 md:text-right space-y-3">
          {aside}
        </div>
      )}
    </section>
  );
}
