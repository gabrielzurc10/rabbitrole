import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { ColorIcon } from "@/components/ui/color-icon";
import { MatchRing } from "@/components/MatchRing";
import { matchLabel, matchTone } from "@/lib/match";
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
  // Match the MatchRing's thickness proportionally (13px on a ~68px ring) at this
  // larger size, so the score ring reads with the same weight as the job rings.
  const stroke = 20;
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
          className="match-ring-value demo-ring-fill text-primary"
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
              <ColorIcon name="file-text" className="h-4 w-4 shrink-0" />
              resume.pdf
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="btn btn-outline btn-md">
            <ColorIcon name="file-text" className="h-4 w-4" />
            View resume
          </span>
          <span className="btn btn-outline btn-md">
            <ColorIcon name="download" className="h-4 w-4" />
            Download
          </span>
        </div>
      </div>
    </ShowcaseFrame>
  );
}

/* ------------------------------ 2. Feedback ----------------------------- */

const SUMMARY = [
  { label: "Urgent", n: 0, text: "text-critical" },
  { label: "Critical", n: 1, text: "text-warning" },
  { label: "Optional", n: 2, text: "text-optional" },
];

// The one Critical tag — auto-expands in the demo to show its reason + suggested fix.
const CRITICAL_TAG = {
  msg: "Experience bullets list tasks but show no measurable impact.",
  loc: "Professional Experience",
  reason:
    "Recruiters scan for outcomes. Bullets that describe duties without numbers read as generic and hide the scale of what you actually delivered.",
  fix: 'Lead with a metric — e.g. "Cut API latency 40% by adding Redis caching across three core services."',
};

const OPTIONAL_TAGS = [
  { msg: "No mention of unit testing or test-driven development.", loc: "Professional Experience" },
  { msg: "Technical skills could name the specific tools you used.", loc: "Technical Skills" },
];

export function ShowcaseFeedbackDemo() {
  return (
    // Body un-padded + relative so the faux modal can overlay the whole "screen".
    <ShowcaseFrame bodyClassName="relative p-0">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid grid-cols-3 gap-3">
          {SUMMARY.map((s) => (
            <div key={s.label} className="card card-pad text-center">
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
          {/* Severity group headers, like the real resume page (empty tiers omitted). */}
          <h3 className="mb-2 mt-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-warning" />
            Critical (1)
          </h3>
          <div className="tag-chip">
            <span className="tag-dot bg-warning" />
            <span className="flex-1">
              <span className="block text-sm font-medium">{CRITICAL_TAG.msg}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{CRITICAL_TAG.loc}</span>
            </span>
            <Icon name="arrow-right" className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          <h3 className="mb-2 mt-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-optional" />
            Optional (2)
          </h3>
          {OPTIONAL_TAGS.map((t) => (
            <div key={t.msg} className="tag-chip">
              <span className="tag-dot bg-optional" />
              <span className="flex-1">
                <span className="block text-sm font-medium">{t.msg}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.loc}</span>
              </span>
              <Icon name="arrow-right" className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>

      {/* Faux modal: loops open over the Critical tag (copying the real Dialog), then
          closes — overlay dims/blurs the screen, the card fades + scales in. */}
      <div className="demo-modal-overlay" aria-hidden="true" />
      <div className="demo-modal" aria-hidden="true">
        <span className="absolute right-4 top-4 text-muted-foreground">
          <Icon name="x" className="h-4 w-4" />
        </span>
        <div className="mb-3 flex items-center gap-2">
          <span className="badge badge-warning">Critical</span>
          <span className="text-xs text-muted-foreground">{CRITICAL_TAG.loc}</span>
        </div>
        <h2 className="mb-3 text-base font-semibold leading-snug">{CRITICAL_TAG.msg}</h2>
        <div className="space-y-3 text-sm">
          <div>
            <p className="mb-1 font-medium text-muted-foreground">Why it matters</p>
            <p>{CRITICAL_TAG.reason}</p>
          </div>
          <div>
            <p className="mb-1 font-medium text-muted-foreground">Suggested fix</p>
            <p>{CRITICAL_TAG.fix}</p>
          </div>
        </div>
      </div>
    </ShowcaseFrame>
  );
}

/* -------------------------------- 3. Jobs ------------------------------- */

type DemoJob = {
  logo: string;
  title: string;
  company: string;
  loc: string;
  posted: string;
  type: string;
  salary: string;
  via: string;
  pct: number;
  /** When present, the card renders with its match-reasoning panel. */
  reasoning?: string;
};

// Fictional companies for the landing demo (logos are AI-generated placeholders).
const JOBS: DemoJob[] = [
  {
    logo: "/logos/demo/hexalabs.png",
    title: "Software Engineer (SWE)",
    company: "Hexalabs",
    loc: "San Francisco, CA",
    posted: "2 days ago",
    type: "Full-time",
    salary: "$140K–$180K/yr",
    via: "LinkedIn",
    pct: 88,
    reasoning:
      "Strong overlap on the core stack — React, TypeScript and Node all appear in both your resume and the posting. Your AWS and CI/CD experience maps to their cloud-native team; calling out Kubernetes would push this match higher.",
  },
  { logo: "/logos/demo/northbeam.png", title: "Full Stack Engineer", company: "Northbeam", loc: "Austin, TX", posted: "4 days ago", type: "Full-time", salary: "$120K–$160K/yr", via: "Indeed", pct: 84 },
  {
    logo: "/logos/demo/lumient.png",
    title: "Frontend Engineer",
    company: "Lumient",
    loc: "New York, NY",
    posted: "5 days ago",
    type: "Contract",
    salary: "$75–$95/hr",
    via: "Greenhouse",
    pct: 82,
    reasoning:
      "Your React and TypeScript depth lines up with their design-system work, and the accessibility focus in your last role matches a core requirement. More on performance profiling would push the fit even higher.",
  },
  { logo: "/logos/demo/pinnacle.png", title: "Backend Engineer", company: "Pinnacle Data", loc: "Seattle, WA", posted: "1 week ago", type: "Full-time", salary: "$130K–$170K/yr", via: "Lever", pct: 79 },
];

function DemoJobCard({ job }: { job: (typeof JOBS)[number] }) {
  const tone = matchTone(job.pct);
  return (
    <div className="job-card">
      <div className="job-card-main">
        <div className="flex items-start gap-3">
          {/* loading="lazy": below-the-fold decorative logos — stops Next/React from
              emitting a <link rel=preload> that fires the "preloaded but not used" warning. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized */}
          <img src={job.logo} alt="" loading="lazy" className="job-card-logo" />
          <div className="min-w-0">
            <h3 className="job-card-title">{job.title}</h3>
            <p className="job-card-company">{job.company}</p>
          </div>
        </div>
        {/* Meta: same fixed-slot grid as the real card (location top-left, posted below). */}
        <div className="job-card-rule" />
        <div className="job-card-meta">
          <span className="job-meta-item col-start-1 row-start-1">
            <ColorIcon name="map-pin" className="h-4 w-4" />
            {job.loc}
          </span>
          <span className="job-meta-item col-start-3 row-start-1 justify-self-end">
            <ColorIcon name="briefcase" className="h-4 w-4" />
            {job.type}
          </span>
          <span className="job-meta-item col-start-1 row-start-2">
            <ColorIcon name="clock" className="h-4 w-4" />
            Posted {job.posted}
          </span>
          <span className="job-meta-item col-start-3 row-start-2 justify-self-end">
            <ColorIcon name="banknote" className="h-4 w-4" />
            {job.salary}
          </span>
        </div>
        {/* Actions */}
        <div className="job-card-rule" />
        <div className="job-card-actions">
          <div className="flex shrink-0 items-center gap-3">
            <span className="truncate text-xs text-muted-foreground">via {job.via}</span>
            <span className="btn btn-primary btn-sm group">
              Apply
              <Icon name="arrow-right" className="icon-nudge-right h-4 w-4" />
            </span>
          </div>
        </div>
        {/* Match reasoning (kept as-is) */}
        {job.reasoning && (
          <div className="job-reason-panel">
            <div className="job-reason-heading">
              <ColorIcon name="sparkles" className="h-3.5 w-3.5 shrink-0" />
              Match reasoning
            </div>
            <p className="job-reason-text">{job.reasoning}</p>
          </div>
        )}
      </div>
      <div className={cn("job-card-match", tone.panel)}>
        <MatchRing percent={job.pct} size={84} toneClass={tone.ring} />
        <span className={cn("job-card-match-label", tone.text)}>{matchLabel(job.pct)}</span>
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
