import { Link } from "react-router";

import { DisplayHeading } from "@bookshelf/ui/components/display-heading";
import { MicroLabel } from "@bookshelf/ui/components/micro-label";
import { Panel } from "@bookshelf/ui/components/panel";

import { RatingStars } from "./rating-stars";

type BookListItemProps = {
  to: string;
  slotIndex: number;
  title: string;
  authors: string[];
  rating: number | null;
};

export function BookListItem({ to, slotIndex, title, authors, rating }: BookListItemProps) {
  const slot = (slotIndex + 1).toString().padStart(3, "0");

  return (
    <Panel asChild interactive surface="card" padding="md" className="group">
      <Link to={to} className="grid grid-cols-12 items-center gap-4">
        <div className="col-span-12 md:col-span-1">
          <MicroLabel className="font-mono">SLOT_{slot}</MicroLabel>
        </div>

        <div className="col-span-12 md:col-span-7 min-w-0">
          <DisplayHeading
            as="h2"
            data-testid="book-title"
            className="truncate text-base md:text-lg text-foreground leading-tight group-hover:text-primary transition-colors"
          >
            {title}
          </DisplayHeading>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            by <span className="text-foreground/80">{authors.join(", ")}</span>
          </p>
        </div>

        <div className="col-span-10 md:col-span-3 md:text-right">
          {rating !== null ? <RatingStars rating={rating} className="font-mono text-xs text-accent" /> : <MicroLabel>unrated</MicroLabel>}
        </div>

        <div className="col-span-2 md:col-span-1 md:text-right">
          <span className="font-mono text-primary transition-transform group-hover:translate-x-1 inline-block">→</span>
        </div>
      </Link>
    </Panel>
  );
}
