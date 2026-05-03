import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@bookshelf/ui/lib/utils"
import { MicroLabel } from "@bookshelf/ui/components/micro-label"

const statReadoutValueVariants = cva(
  "font-mono text-sm tabular-nums",
  {
    variants: {
      tone: {
        foreground: "text-foreground",
        primary: "text-primary",
        accent: "text-accent",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "foreground",
    },
  }
)

type StatReadoutProps = React.ComponentProps<"div"> & {
  label: React.ReactNode
  valueTone?: VariantProps<typeof statReadoutValueVariants>["tone"]
  valueClassName?: string
}

function StatReadout({
  className,
  label,
  valueTone,
  valueClassName,
  children,
  ...props
}: StatReadoutProps) {
  return (
    <div
      data-slot="stat-readout"
      className={cn("space-y-1", className)}
      {...props}
    >
      <MicroLabel>{label}</MicroLabel>
      <div
        className={cn(
          statReadoutValueVariants({ tone: valueTone }),
          valueClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

export { StatReadout }
