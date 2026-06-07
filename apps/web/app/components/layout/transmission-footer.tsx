import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { formatCount } from "../../lib/format";

type TransmissionFooterProps = {
  total: number;
};

export function TransmissionFooter({ total }: TransmissionFooterProps) {
  return (
    <footer className="mt-16 pt-6 border-t border-border/60 flex items-center justify-between">
      <MicroLabel>
        <span className="text-primary" aria-hidden="true">◆</span> end_of_transmission
      </MicroLabel>
      <MicroLabel className="hidden md:inline-block" aria-hidden="true">─── deep-space archives ────────────────────────────────────────</MicroLabel>
      <MicroLabel aria-label={`${total} books stored`}>{formatCount(total)}/∞ stored</MicroLabel>
    </footer>
  );
}
