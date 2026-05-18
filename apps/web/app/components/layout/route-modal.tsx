import * as React from "react";
import { Dialog } from "radix-ui";
import { useNavigate } from "react-router";

import { Button } from "@bookshelf/ui/components/button";

type RouteModalProps = {
  returnTo: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function RouteModal({ returnTo, title, description, children, className }: RouteModalProps) {
  const navigate = useNavigate();
  return (
    <Dialog.Root open onOpenChange={(open) => !open && navigate(returnTo)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content
          className={
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg " +
            (className ?? "")
          }
        >
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          {description != null && (
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function RouteModalCancel({
  children = "Cancel",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Dialog.Close asChild>
      <Button type="button" variant="ghost" {...props}>
        {children}
      </Button>
    </Dialog.Close>
  );
}
