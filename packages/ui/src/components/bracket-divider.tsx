import * as React from "react"

import { cn } from "@bookshelf/ui/lib/utils"
import { MicroLabel } from "@bookshelf/ui/components/micro-label"

type BracketDividerProps = React.ComponentProps<"div"> & {
  label?: React.ReactNode
  trailing?: React.ReactNode
}

function BracketDivider({
  className,
  label,
  trailing,
  ...props
}: BracketDividerProps) {
  return (
    <div
      data-slot="bracket-divider"
      className={cn(
        "flex items-center gap-3 text-muted-foreground",
        className
      )}
      {...props}
    >
      {label != null && <MicroLabel tone="primary">[ {label} ]</MicroLabel>}
      <span className="h-px flex-1 bg-border" aria-hidden />
      {trailing != null && <MicroLabel>{trailing}</MicroLabel>}
    </div>
  )
}

export { BracketDivider }
