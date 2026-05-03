import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@bookshelf/ui/lib/utils";

const statusIndicatorVariants = cva("inline-flex items-center gap-3", {
  variants: {
    tone: {
      primary: "text-primary",
      accent: "text-accent",
      muted: "text-muted-foreground",
      destructive: "text-destructive",
      foreground: "text-foreground",
    },
  },
  defaultVariants: {
    tone: "muted",
  },
});

function StatusIndicator({
  className,
  tone,
  pulsing = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof statusIndicatorVariants> & {
    pulsing?: boolean;
  }) {
  return (
    <span
      data-slot="status-indicator"
      data-tone={tone}
      data-pulsing={pulsing || undefined}
      className={cn(statusIndicatorVariants({ tone, className }))}
      {...props}
    >
      <span className={cn("status-dot", pulsing && "is-pulsing")} aria-hidden />
      <span data-slot="status-indicator-label">{children}</span>
    </span>
  );
}

export { StatusIndicator, statusIndicatorVariants };
