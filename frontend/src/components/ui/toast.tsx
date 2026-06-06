"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * A small success toast pinned to the bottom-right. Slides up + fades in, then
 * auto-dismisses after `duration` ms (caller flips `open` back off via onClose).
 */
export function Toast({
  open,
  message,
  onClose,
  duration = 2500,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;
  return (
    <div role="status" className="toast motion-safe:animate-[slide-up_0.25s_ease-out]">
      <Icon name="check-circle" className="h-5 w-5" />
      {message}
    </div>
  );
}
