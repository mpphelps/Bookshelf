import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { Panel } from "@bookshelf/ui/components/panel";

import { timestamp } from "~/lib/format";

type LogEntryProps = {
  index: number;
  createdAt: Date | string;
  content: string;
};

export function LogEntry({ index, createdAt, content }: LogEntryProps) {
  const slot = (index + 1).toString().padStart(3, "0");
  return (
    <Panel padding="md" surface="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <MicroLabel className="font-mono">log_{slot}</MicroLabel>
        <MicroLabel>{timestamp(createdAt)}</MicroLabel>
      </div>
      <p
        data-testid="note"
        className="font-mono text-sm text-foreground leading-relaxed whitespace-pre-wrap"
      >
        {content}
      </p>
    </Panel>
  );
}
