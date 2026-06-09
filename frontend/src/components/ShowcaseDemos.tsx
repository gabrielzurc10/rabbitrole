import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { MatchRing } from "@/components/MatchRing";
import { cn } from "@/lib/cn";

/**
 * Live, self-contained recreations of the product screenshots used in the landing
 * showcase — styled with the same component classes as the real UI, but with looping
 * CSS animations so each one reads like a short demo clip. Everything here is
 * decorative and non-interactive (no data, no handlers).
 */

/** A faux app/window frame so each demo reads as a screen recording. */
function ShowcaseFrame({
  children,
  className,
  bodyClassName,
}: {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("showcase-frame", className)}>
      <div className="showcase-frame-bar">
        <span className="bg-critical/60" />
        <span className="bg-warning/60" />
        <span className="bg-primary/60" />
      </div>
      <div className={cn("showcase-frame-body", bodyClassName)}>{children}</div>
    </div>
  );
}

/* ------------------------------- 1. Score ------------------------------- */

/** Progress ring that fills to `percent` on a loop (the demo "scoring" beat). */
function ScoringRing({ percent, size = 132 }: { percent: number; size?: number }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const off = circ - (percent / 100) * circ;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="match-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <circle
          className="match-ring-value demo-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={off}
          style={{ "--circ": circ, "--off": off } as CSSProperties}
        />
      </svg>
      {/* The number is generated via a CSS counter (::after) so it can count up/down with
          the ring; --target seeds it (and is the resting value under reduced motion). */}
      <span
        className="demo-score absolute text-2xl font-semibold tabular-nums"
        style={{ "--target": percent } as CSSProperties}
      />
    </div>
  );
}

export function ShowcaseScoreDemo() {
  return (
    <ShowcaseFrame>
      <div className="space-y-6">
        <div className="flex items-center gap-6">
          <ScoringRing percent={85} />
          <div className="min-w-0">
            <h3 className="text-xl font-bold tracking-tight">Resume score</h3>
            <p className="mt-1 text-muted-foreground">
              Graded against your primary role, Software Engineer.
            </p>
            <p className="mt-3 flex items-center gap-2 font-medium">
              <Icon name="file-text" className="h-4 w-4 shrink-0" />
              resume.pdf
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="btn btn-outline btn-md">
            <Icon name="file-text" className="h-4 w-4" />
            View resume
          </span>
          <span className="btn btn-outline btn-md">
            <Icon name="download" className="h-4 w-4" />
            Download
          </span>
        </div>
      </div>
    </ShowcaseFrame>
  );
}

/* ------------------------------ 2. Feedback ----------------------------- */

const SUMMARY = [
  { label: "Critical", n: 0, text: "text-critical" },
  { label: "Warning", n: 2, text: "text-warning" },
  { label: "Optional", n: 4, text: "text-optional" },
];

const FEEDBACK_TAGS = [
  { dot: "bg-warning", msg: "Lacks explicit mention of cloud-native architecture experience.", loc: "Professional Experience" },
  { dot: "bg-warning", msg: "Limited mention of Agile methodologies.", loc: "Professional Summary or Professional Experience" },
  { dot: "bg-optional", msg: "No mention of unit testing or test-driven development.", loc: "Professional Experience" },
  { dot: "bg-optional", msg: "Could benefit from more emphasis on collaboration with cross-functional teams.", loc: "Professional Experience" },
  { dot: "bg-optional", msg: "No mention of specific software development lifecycle (SDLC) methodologies.", loc: "Professional Experience" },
  { dot: "bg-optional", msg: "Could enhance the technical skills section with specific tools used.", loc: "Technical Skills" },
];

export function ShowcaseFeedbackDemo() {
  return (
    <ShowcaseFrame>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {SUMMARY.map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/50 p-4 text-center dark:bg-white/5">
              <div className={cn("text-3xl font-bold", s.text)}>{s.n}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold tracking-tight">Suggested improvements</h3>
          <p className="text-sm text-muted-foreground">
            Click any tag to see why it matters and a suggested replacement.
          </p>
        </div>
        <div className="space-y-2">
          {FEEDBACK_TAGS.map((t, i) => (
            <div
              key={t.msg}
              className="tag-chip demo-tag"
              style={{ animationDelay: `${i}s` }}
            >
              <span className={cn("tag-dot", t.dot)} />
              <span className="flex-1">
                <span className="block text-sm font-medium">{t.msg}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.loc}</span>
              </span>
              <Icon name="arrow-right" className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </ShowcaseFrame>
  );
}

/* -------------------------------- 3. Jobs ------------------------------- */

const JOBS = [
  { initials: "BA", tint: "bg-optional/15 text-optional", title: "Full Stack Engineer", company: "Booz Allen Hamilton", loc: "Arlington, VA", posted: "2 days ago", pct: 60, label: "Good match" },
  { initials: "KR", tint: "bg-primary/15 text-primary", title: "Software Engineer (SWE)", company: "Kroll", loc: "Washington, DC", posted: "5 days ago", pct: 62, label: "Good match" },
  { initials: "SA", tint: "bg-accent/15 text-accent", title: "Software Engineer", company: "SAIC", loc: "Arlington, VA", posted: "6 days ago", pct: 59, label: "Fair match" },
  { initials: "GH", tint: "bg-warning/15 text-warning", title: "Software Engineer / Architect", company: "Guidehouse", loc: "Washington, DC", posted: "1 week ago", pct: 57, label: "Fair match" },
];

function DemoJobCard({ job }: { job: (typeof JOBS)[number] }) {
  return (
    <div className="job-card">
      <div className="job-card-main">
        <div className="flex items-start gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold", job.tint)}>
            {job.initials}
          </span>
          <div className="min-w-0">
            <h3 className="job-card-title">{job.title}</h3>
            <p className="job-card-company">{job.company}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="job-meta-item">
            <Icon name="map-pin" className="h-4 w-4" />
            {job.loc}
          </span>
          <span className="job-meta-item">
            <Icon name="clock" className="h-4 w-4" />
            Posted {job.posted}
          </span>
        </div>
        <div className="job-card-actions">
          <span className="job-reason-toggle">
            <Icon name="info" className="h-4 w-4 shrink-0" />
            <span className="truncate">Why this match?</span>
            <Icon name="chevron-down" className="h-4 w-4 shrink-0" />
          </span>
          <span className="btn btn-primary btn-sm shrink-0">
            Apply
            <Icon name="arrow-right" className="h-4 w-4" />
          </span>
        </div>
      </div>
      <div className="job-card-match sm:w-36">
        <MatchRing percent={job.pct} size={68} />
        <span className="job-card-match-label">{job.label}</span>
      </div>
    </div>
  );
}

export function ShowcaseJobsDemo() {
  // Doubled list + a -50% scroll = a seamless, continuously scrolling feed.
  const feed = [...JOBS, ...JOBS];
  return (
    <ShowcaseFrame bodyClassName="p-0">
      <div className="demo-scroll-window">
        <div className="demo-scroll-track">
          {feed.map((job, i) => (
            <DemoJobCard key={`${job.company}-${i}`} job={job} />
          ))}
        </div>
      </div>
    </ShowcaseFrame>
  );
}

/** Index-aligned with the landing STEPS array. */
export const SHOWCASE_DEMOS = [ShowcaseScoreDemo, ShowcaseFeedbackDemo, ShowcaseJobsDemo];
