import { cn } from "@bookshelf/ui/lib/utils";

type RatingStarsProps = {
  rating: number;
  total?: number;
  className?: string;
};

export function RatingStars({ rating, total = 5, className }: RatingStarsProps) {
  const filled = "★".repeat(rating);
  const empty = "★".repeat(Math.max(0, total - rating));
  return (
    <span
      className={cn("tabular-nums", className)}
      aria-label={`rated ${rating} of ${total}`}
    >
      {filled}
      <span className="text-muted-foreground/40">{empty}</span>
    </span>
  );
}
