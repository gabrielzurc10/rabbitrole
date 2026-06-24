"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * A small success toast that auto-dismisses after `duration` ms (caller flips `open`
 * back off via onClose). `placement` picks the spot + entrance: "bottom-right" (default,
 * slides up) or "top-center" — a pill just below the navbar that slides down.
 */
export function Toast({
  open,
  message,
  onClose,
  duration = 2500,
  placement = "bottom-right",
}: {
  open: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
  placement?: "bottom-right" | "top-center";
}) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  const body = (
    <>
      <Icon name="check-circle" className="h-5 w-5" />
      {message}
    </>
  );

  if (placement === "top-center") {
    return (
      <div className="toast-top-wrap">
        <div role="status" className="toast-top motion-safe:animate-[slide-down_0.25s_ease-out]">
          {body}
        </div>
      </div>
    );
  }

  return (
    <div role="status" className="toast motion-safe:animate-[slide-up_0.25s_ease-out]">
      {body}
    </div>
  );
}
