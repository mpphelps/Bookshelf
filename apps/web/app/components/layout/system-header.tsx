import { Button } from "@bookshelf/ui/components/button";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { StatusIndicator } from "@bookshelf/ui/components/status-indicator";

type SystemHeaderProps = {
  userName: string;
  section?: string;
  build?: string;
};

export function SystemHeader({
  userName,
  section = "MISSION_LOG",
  build = "v0.1.0 · sector-7",
}: SystemHeaderProps) {
  return (
    <header className="border-b border-border/80 bg-background/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-xs">
        <div className="flex items-center gap-6">
          <span className="display text-foreground tracking-[0.2em]">
            BOOKSHELF
          </span>
          <span className="text-muted-foreground hidden md:inline">
            <span className="text-primary">/</span> {section}
          </span>
          <MicroLabel className="hidden md:inline">{build}</MicroLabel>
        </div>

        <div className="flex items-center gap-5">
          <StatusIndicator tone="accent" pulsing className="hidden sm:flex">
            <MicroLabel tone="foregroundSoft">link ok</MicroLabel>
          </StatusIndicator>

          <MicroLabel>
            op: <span className="text-foreground">{userName}</span>
          </MicroLabel>

          <Button variant="ghost" size="sm" asChild>
            <a href="/auth/logout" className="display !text-[10px]">
              disconnect
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
