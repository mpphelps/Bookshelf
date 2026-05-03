import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@bookshelf/ui/lib/utils"

const panelVariants = cva("panel-brackets relative", {
  variants: {
    surface: {
      card: "bg-card/60 border border-border/60",
      flat: "bg-transparent border border-border/60",
      none: "",
    },
    interactive: {
      true: "block transition-all duration-300 hover:bg-card hover:border-primary/50 hover:shadow-[0_0_24px_-4px_oklch(0.80_0.16_75/0.35),inset_0_0_0_1px_oklch(0.80_0.16_75/0.15)]",
      false: "",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: {
    surface: "card",
    interactive: false,
    padding: "md",
  },
})

type PanelProps = React.ComponentProps<"div"> &
  VariantProps<typeof panelVariants> & {
    asChild?: boolean
  }

function Panel({
  className,
  surface,
  interactive,
  padding,
  asChild = false,
  ...props
}: PanelProps) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="panel"
      data-interactive={interactive || undefined}
      className={cn(
        panelVariants({ surface, interactive, padding, className })
      )}
      {...props}
    />
  )
}

export { Panel, panelVariants }
