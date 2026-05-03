import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@bookshelf/ui/lib/utils"

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "div"

type DisplayHeadingProps = React.ComponentProps<"h2"> & {
  as?: HeadingTag
  asChild?: boolean
}

function DisplayHeading({
  className,
  as: Tag = "h2",
  asChild = false,
  ...props
}: DisplayHeadingProps) {
  const Comp = asChild ? Slot.Root : Tag
  return (
    <Comp
      data-slot="display-heading"
      className={cn("display", className)}
      {...props}
    />
  )
}

export { DisplayHeading }
