"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Job } from "@/types";
import { JobDetail } from "@/components/JobDetail";
import { Icon } from "@/components/ui/icon";

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
          <div className="job-sheet-body">{job && <JobDetail key={job.id} job={job} />}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
