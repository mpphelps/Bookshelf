import { DisplayHeading } from "@bookshelf/ui/components/display-heading";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { StatReadout } from "@bookshelf/ui/components/stat-readout";
import { StatusIndicator } from "@bookshelf/ui/components/status-indicator";
import { formatCount, timestamp } from "../../lib/format";

type TelemetryHeaderProps = {
  userName: string;
  total: number;
};

export function TelemetryHeader({ userName, total }: TelemetryHeaderProps) {
  const firstName = userName.split(" ")[0];

  return (
    <section className="mb-12 grid grid-cols-12 gap-6 items-end">
      <div className="col-span-12 md:col-span-8">
        <MicroLabel className="mb-3 block">
          <span className="text-primary">▸</span> personal library terminal
        </MicroLabel>

        <DisplayHeading
          as="h1"
          className="text-3xl md:text-4xl text-foreground leading-[1.1]"
        >
          Greetings, {firstName}.
          <br />
          <span className="text-primary">{formatCount(total)}</span>{" "}
          <span className="text-muted-foreground text-2xl md:text-3xl">
            volumes on record.
          </span>
        </DisplayHeading>
      </div>

      <div className="col-span-12 md:col-span-4 md:text-right space-y-3">
        <StatReadout label="timestamp / utc">{timestamp()}</StatReadout>
        <StatReadout
          label="database integrity"
          valueTone="accent"
          valueClassName="flex md:justify-end items-center gap-2"
        >
          <StatusIndicator tone="accent">NOMINAL</StatusIndicator>
        </StatReadout>
      </div>
    </section>
  );
}
