import { cn } from "@/lib/cn";

/**
 * A shimmering placeholder block. Compose several into a layout that mirrors the
 * real content so loading feels like the page filling in, not a spinner. The
 * shimmer is the `.skeleton` class (see styles/components.css); it falls back to
 * a static muted block under prefers-reduced-motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/**
 * Loading state for the Jobs page — mirrors <JobCard />: a main column (logo +
 * title/company, meta row, actions) beside the gradient match panel with its ring.
 */
export function JobsSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="job-card">
          <div className="job-card-main">
            {/* Header: logo + title + company */}
            <div className="flex items-start gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>

            {/* Meta: same fixed 3-column grid as the card — location/remote/type on
                top, posted/salary below. */}
            <div className="job-card-rule" />
            <div className="job-card-meta">
              <Skeleton className="col-start-1 row-start-1 h-3 w-24" />
              <Skeleton className="col-start-2 row-start-1 h-3 w-24 justify-self-center" />
              <Skeleton className="col-start-3 row-start-1 h-3 w-20 justify-self-end" />
              <Skeleton className="col-start-1 row-start-2 h-3 w-28" />
              <Skeleton className="col-start-3 row-start-2 h-3 w-20 justify-self-end" />
            </div>

            {/* Actions: "why this match?" toggle, then publisher + Apply */}
            <div className="job-card-rule" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Match panel (84px ring + label) */}
          <div className="job-card-match">
            <Skeleton className="h-[84px] w-[84px] shrink-0 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Loading state for the resume review page — header, score summary, tag list. */
export function ResumeReviewSkeleton() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-[72px] w-[72px] shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-80" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Loading state for the Profile page — header + score, resume, preference cards. */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="card card-pad space-y-4">
        <div className="flex items-center gap-5">
          <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      <div className="card card-pad space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      <div className="card card-pad space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-2/3 rounded-lg" />
      </div>
    </div>
  );
}
