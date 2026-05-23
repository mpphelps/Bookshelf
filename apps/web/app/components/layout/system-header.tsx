import { Button } from "@bookshelf/ui/components/button";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { StatusIndicator } from "@bookshelf/ui/components/status-indicator";
import { Link } from "react-router";

type SystemHeaderProps = {
  userName: string;
  section?: string;
  build?: string;
};

export function SystemHeader({ userName, section = "MISSION_LOG", build = "v0.1.0 · sector-7" }: SystemHeaderProps) {
  const displayName = userName.includes("@")
    ? userName.split("@")[0]
    : userName.split(" ")[0];

  return (
    <header className="border-b border-border/80 bg-background/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 text-xs sm:gap-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Button variant="ghost" size="xs" asChild>
            <Link to={`/`} className="display !text-[12px]">
              BOOKSHELF
            </Link>
          </Button>
          <span className="text-muted-foreground hidden md:inline">
            <span className="text-primary">/</span> {section}
          </span>
          <MicroLabel className="hidden md:inline">{build}</MicroLabel>
        </div>

        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <StatusIndicator tone="accent" pulsing className="hidden sm:flex">
            <MicroLabel tone="foregroundSoft">link ok</MicroLabel>
          </StatusIndicator>

          <MicroLabel className="inline-flex min-w-0 items-baseline gap-1">
            <span className="shrink-0">op:</span>
            <span
              className="block max-w-[10ch] truncate text-foreground sm:max-w-[16ch] md:max-w-[24ch]"
              title={userName}
            >
              {displayName}
            </span>
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
