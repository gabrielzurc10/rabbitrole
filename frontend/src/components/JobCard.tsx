"use client";

import { useState } from "react";
import { Job } from "@/types";
import { MatchRing } from "@/components/MatchRing";
import { Skeleton } from "@/components/Skeleton";
import { Collapse } from "@/components/Collapse";
import { EMPLOYMENT_LABELS } from "@/components/EmploymentTypeSelector";
import { ErrorAlert } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { getJobReasoning, ApiError } from "@/lib/api";
import { matchLabel, matchTone } from "@/lib/match";
import { cn } from "@/lib/cn";

const SALARY_PERIOD_SUFFIX: Record<string, string> = {
  YEAR: "/yr",
  MONTH: "/mo",
  WEEK: "/wk",
  DAY: "/day",
  HOUR: "/hr",
};

/**
 * A compact pay string from JSearch's structured fields, or null when no salary
 * data is present (it usually isn't). Shows a range, or a one-sided "From / Up to"
 * when only one bound is known, plus a period suffix — e.g. "$90K–$120K/yr". Any
 * formatting failure (e.g. an unexpected currency code) degrades to null.
 */
function formatSalary(job: Job): string | null {
  const { salaryMin, salaryMax, salaryCurrency, salaryPeriod } = job;
  if (salaryMin == null && salaryMax == null) return null;
  try {
    const currency = salaryCurrency || "USD";
    const money = (n: number) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
        notation: n >= 10000 ? "compact" : "standard",
      }).format(n);
    const suffix = salaryPeriod ? (SALARY_PERIOD_SUFFIX[salaryPeriod.toUpperCase()] ?? "") : "";
    const range =
      salaryMin != null && salaryMax != null
        ? `${money(salaryMin)}–${money(salaryMax)}`
        : salaryMin != null
          ? `From ${money(salaryMin)}`
          : `Up to ${money(salaryMax as number)}`;
    return range + suffix;
  } catch {
    return null;
  }
}

/** A relative "3 days ago"-style phrase from an ISO instant, or null. */
function formatPosted(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const diff = Date.now() - t;
  if (diff < 0) return null; // future/clock-skewed data — skip rather than show nonsense
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return rtf.format(-Math.max(minutes, 1), "minute");
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(diff / 86400000);
  if (days < 30) return rtf.format(-days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return rtf.format(-months, "month");
  return rtf.format(-Math.floor(days / 365), "year");
}

export function JobCard({ job }: { job: Job }) {
  // All cards start collapsed. Top matches arrive with a re-rank reason already
  // attached, so we seed it — expanding then shows it instantly with no fetch. Feed
  // cards (no reason) fetch on demand the first time they're expanded.
  const [expanded, setExpanded] = useState(false);
  const [reasoning, setReasoning] = useState<string | null>(job.reason ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefer the clean parsed city/state; fall back to the raw location string.
  const location = [job.city, job.state].filter(Boolean).join(", ") || job.location;
  const isRemote = job.workMode === "remote";
  const employmentLabel = job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null;
  const salary = formatSalary(job);
  const posted = formatPosted(job.postedAt);
  const hasMeta = Boolean(isRemote || location || employmentLabel || salary || posted);
  const tone = matchTone(job.matchPercent);

  async function toggleReasoning() {
    const next = !expanded;
    setExpanded(next);
    // Lazy: fetch only on the first expand, then keep it cached in state.
    if (next && reasoning === null && !loading) {
      setLoading(true);
      setError(null);
      try {
        setReasoning(await getJobReasoning(job));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Couldn't load the reasoning.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="job-card">
      <div className="job-card-main">
        {/* Header: logo + title + company */}
        <div className="flex items-start gap-3">
          {job.employerLogo && (
            // External raster logo (not an icon) — hide it if the URL 404s.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.employerLogo}
              alt=""
              className="job-card-logo"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <div className="min-w-0">
            <h3 className="job-card-title">{job.title}</h3>
            <p className="job-card-company">{job.company}</p>
          </div>
        </div>

        {/* Meta: only the fields native to our setup */}
        {hasMeta && (
          <>
            <div className="job-card-rule" />
            <div className="job-card-meta">
              {/* Fixed slots: location top-left, remote eligibility top-middle,
                  employment top-right, posted bottom-left, salary bottom-right.
                  Each is independent — a job can have both a location and be remote
                  eligible — and absent fields leave their slot empty rather than
                  shifting the others. */}
              {location && (
                <span className="job-meta-item col-start-1 row-start-1">
                  <Icon name="map-pin" className="h-4 w-4" />
                  {location}
                </span>
              )}
              {isRemote && (
                <span className="job-meta-item col-start-2 row-start-1 justify-self-center">
                  <Icon name="monitor" className="h-4 w-4" />
                  Remote
                </span>
              )}
              {employmentLabel && (
                <span className="job-meta-item col-start-3 row-start-1 justify-self-end">
                  <Icon name="briefcase" className="h-4 w-4" />
                  {employmentLabel}
                </span>
              )}
              {posted && (
                <span className="job-meta-item col-start-1 row-start-2">
                  <Icon name="clock" className="h-4 w-4" />
                  Posted {posted}
                </span>
              )}
              {salary && (
                <span className="job-meta-item col-start-3 row-start-2 justify-self-end">
                  <Icon name="banknote" className="h-4 w-4" />
                  {salary}
                </span>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="job-card-rule" />
        <div className="job-card-actions">
          <button
            type="button"
            onClick={toggleReasoning}
            aria-expanded={expanded}
            aria-label="Why this match?"
            className="job-reason-toggle group"
          >
            {/* Info icon always; the "Why this match?" label only shows from sm up. */}
            <Icon name="info" className="icon-nudge-up h-4 w-4 shrink-0" />
            <span className="hidden truncate sm:inline">Why this match?</span>
            <Icon
              name="chevron-down"
              className={cn("h-4 w-4 shrink-0 transition-transform", expanded && "rotate-180")}
            />
          </button>
          <div className="flex shrink-0 items-center gap-3">
            {job.publisher && (
              <span className="truncate text-xs text-muted-foreground">via {job.publisher}</span>
            )}
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm group"
            >
              Apply
              <Icon name="arrow-right" className="icon-nudge-right h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Animate the card's height as the reasoning opens/closes. `!mt-0` cancels the
            parent's space-y gap; the inner panel's own mt-4 collapses with the content. */}
        <Collapse open={expanded} bleedShadow={false} className="!mt-0">
          <div className="job-reason-panel mt-4">
            <div className="job-reason-heading">
              <Icon name="sparkles" className="h-3.5 w-3.5 shrink-0" />
              Match reasoning
            </div>
            {loading && (
              <div className="space-y-2" aria-label="Loading reasoning" role="status">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            )}
            {error && <ErrorAlert message={error} />}
            {reasoning && <p className="job-reason-text">{reasoning}</p>}
          </div>
        </Collapse>
      </div>

      {/* Match panel */}
      <div className={cn("job-card-match", tone.panel)}>
        <MatchRing percent={job.matchPercent ?? 0} size={84} toneClass={tone.ring} />
        <span className={cn("job-card-match-label", tone.text)}>
          {matchLabel(job.matchPercent)}
        </span>
      </div>
    </div>
  );
}
