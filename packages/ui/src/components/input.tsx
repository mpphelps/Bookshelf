import * as React from "react";

import { cn } from "@bookshelf/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const inputVariants = cva(
  "flex w-full min-w-0 rounded-lg border border-input bg-transparent transition-colors outline-none file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        xs: "h-6 px-2 py-0.5 text-xs file:h-4 file:text-xs",
        sm: "h-7 px-2 py-1 text-sm file:h-5 file:text-xs",
        default: "h-8 px-2.5 py-1 text-base file:h-6 file:text-sm md:text-sm",
        lg: "h-9 px-3 py-1.5 text-base file:h-7 file:text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

function Input({
  className,
  size = "default",
  type,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  );
}

export { Input, inputVariants };
