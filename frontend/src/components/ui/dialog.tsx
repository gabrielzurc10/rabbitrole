"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/** Accessible dialog (Radix), styled by us via component classes. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog-overlay" />
        <RadixDialog.Content className="dialog-content motion-safe:animate-[slide-up_0.25s_ease-out]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="card-title">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="card-subtitle mt-1">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close aria-label="Close" className="btn btn-ghost btn-icon">
              <Icon name="x" />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
