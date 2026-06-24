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
export function JobsSkeleton({
  count = 4,
  className = "mt-6 space-y-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
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

/**
 * The analysis-derived part of the resume review — the 3 score-summary cards and the
 * tag list. Split out so the page can show just this while the resume + upload cards
 * (which only need the cached profile) are already rendered for real.
 */
export function ReviewBodySkeleton() {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-80" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}

/** Loading state for the resume review page — mirrors header, resume score card,
 *  update-resume card, then the score summary + tag list (ReviewBodySkeleton). */
export function ResumeReviewSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header: title + subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Resume score card: ring + text lines, then View/Download buttons */}
      <div className="card card-pad space-y-4">
        <div className="flex items-center gap-5">
          <Skeleton className="h-[104px] w-[104px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* Update resume card: title + subtitle + upload button */}
      <div className="card card-pad space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      <ReviewBodySkeleton />
    </div>
  );
}

/** Loading state for the Profile (account) page — header + sign-out, account card
 *  (name + email + save), appearance card, and the delete-account card. */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header: name + subtitle, Sign out button */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-28 shrink-0 rounded-lg" />
      </div>

      {/* Account card: title + name field + email row + save */}
      <div className="card card-pad space-y-5">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Appearance card: title/subtitle + theme switch */}
      <div className="card card-pad flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-8 w-24 shrink-0 rounded-lg" />
      </div>

      {/* Delete account card */}
      <div className="card card-pad flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36 shrink-0 rounded-lg" />
      </div>
    </div>
  );
}
