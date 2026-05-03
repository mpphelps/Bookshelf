import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@bookshelf/ui/lib/utils"

const microLabelVariants = cva("micro-label", {
  variants: {
    tone: {
      default: "",
      primary: "!text-primary",
      accent: "!text-accent",
      foreground: "!text-foreground",
      foregroundSoft: "!text-foreground/80",
    },
  },
  defaultVariants: {
    tone: "default",
  },
})

function MicroLabel({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof microLabelVariants>) {
  return (
    <span
      data-slot="micro-label"
      data-tone={tone}
      className={cn(microLabelVariants({ tone, className }))}
      {...props}
    />
  )
}

export { MicroLabel, microLabelVariants }
