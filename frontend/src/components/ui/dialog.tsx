"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onClose,
  children,
  className,
  title = "Dialog",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Extra classes on the content box (e.g. a wider modal for previews). */
  className?: string;
  /** Accessible title (visually hidden). */
  title?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className={cn("dialog-content", className)}>
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
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
