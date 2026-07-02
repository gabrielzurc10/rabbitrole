"use client";

import { useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Job } from "@/types";
import { JobDetail } from "@/components/JobDetail";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * Mobile-only bottom sheet for the selected posting. Mount it only below the `lg`
 * breakpoint (the Jobs page gates this with a media query) so Radix's body
 * scroll-lock never fires on desktop, where the same content lives in a side panel.
 */
export function JobDetailSheet({
  job,
  open,
  onClose,
}: {
  job: Job | null;
  open: boolean;
  onClose: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  // Hide the back-to-top button whenever a different posting opens — adjust state during
  // render (React's recommended alternative to a reset effect). Scroll position resets on
  // its own because the body element is keyed by job id below, so it remounts at the top.
  const [prevJobId, setPrevJobId] = useState(job?.id);
  if (job?.id !== prevJobId) {
    setPrevJobId(job?.id);
    setShowTop(false);
  }

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bodyRef.current?.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="job-sheet">
          <DialogPrimitive.Title className="sr-only">Job details</DialogPrimitive.Title>
          {/* Grab handle — purely decorative affordance for the sheet. */}
          <div className="job-sheet-handle" aria-hidden />
          <DialogPrimitive.Close
            className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <Icon name="x" className="h-4 w-4" />
          </DialogPrimitive.Close>
          <div
            key={job?.id ?? "empty"}
            ref={bodyRef}
            className="job-sheet-body"
            onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 400)}
          >
            {job && <JobDetail job={job} />}
          </div>
          <button
            type="button"
            onClick={toTop}
            aria-label="Back to top"
            className={cn(
              "job-sheet-totop",
              showTop ? "scroll-top-visible" : "scroll-top-hidden",
            )}
          >
            <Icon name="arrow-up" className="h-5 w-5" />
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
