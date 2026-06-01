"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Icon } from "@/components/ui/icon";

export function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="dialog-content">
          <DialogPrimitive.Title className="sr-only">
            Tag details
          </DialogPrimitive.Title>
          {children}
          <DialogPrimitive.Close
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <Icon name="x" className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
