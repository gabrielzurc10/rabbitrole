"use client";

import { useEffect, useState } from "react";
import { Job } from "@/types";
import { MatchRing } from "@/components/MatchRing";
import { Skeleton } from "@/components/Skeleton";
import { EMPLOYMENT_LABELS } from "@/components/EmploymentTypeSelector";
import { ErrorAlert } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { ColorIcon } from "@/components/ui/color-icon";
import { getJobReasoning, ApiError } from "@/lib/api";
import { matchLabel, matchTone } from "@/lib/match";
import { formatSalary, formatPosted } from "@/lib/jobFormat";
import { cn } from "@/lib/cn";

/**
 * The rich detail view for a single selected posting — shared by the desktop
 * right-side panel and the mobile bottom sheet. A pinned top section holds the
 * header + Apply; below it, the meta, AI match reasoning (seeded from a Top-match
 * `reason`, else lazy-fetched on first view), and full description scroll together.
 */
export function JobDetail({ job }: { job: Job }) {
  // Seed from the Top-match reason when present, else fetch on mount. This component is
  // keyed on `job.id` by both callers, so it remounts (re-seeding this state) whenever
  // the selected posting changes — the effect only ever performs the async fetch.
  const [reasoning, setReasoning] = useState<string | null>(job.reason ?? null);
  const [loading, setLoading] = useState(!job.reason);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (job.reason) return; // already seeded from the Top-match reason — no fetch
    let cancelled = false;
    getJobReasoning(job)
      .then((r) => !cancelled && setReasoning(r))
      .catch(
        (e) =>
          !cancelled &&
          setError(e instanceof ApiError ? e.message : "Couldn't load the reasoning."),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remounts per posting (keyed)
  }, [job.id]);

  // Prefer the clean parsed city/state; fall back to the raw location string.
  const location = [job.city, job.state].filter(Boolean).join(", ") || job.location;
  const isRemote = job.workMode === "remote";
  const employmentLabel = job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null;
  const salary = formatSalary(job);
  const posted = formatPosted(job.postedAt);
  const tone = matchTone(job.matchPercent);

  return (
    <div className="job-detail">
      {/* Pinned top: header + Apply (stay put while the body scrolls) */}
      <div className="job-detail-top">
        <div className="job-detail-header">
          {job.employerLogo && (
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
          <div className="min-w-0 flex-1">
            <h2 className="job-detail-title">{job.title}</h2>
            <p className="job-card-company">{job.company}</p>
          </div>
          <div className="job-detail-ring">
            <MatchRing percent={job.matchPercent ?? 0} size={56} stroke={8} toneClass={tone.ring} />
            <span className={cn("text-[0.65rem] font-semibold uppercase tracking-wide", tone.text)}>
              {matchLabel(job.matchPercent)}
            </span>
          </div>
        </div>
      </div>

      {/* Fixed: meta + reasoning + the "Job description" label stay pinned. */}
      <div className="job-detail-fixed">
        {/* Meta chips */}
        <div className="job-detail-meta">
          {location && (
            <span className="job-meta-item">
              <ColorIcon name="map-pin" className="h-4 w-4" />
              {location}
            </span>
          )}
          {isRemote && (
            <span className="job-meta-item">
              <ColorIcon name="monitor" className="h-4 w-4" />
              Remote
            </span>
          )}
          {employmentLabel && (
            <span className="job-meta-item">
              <ColorIcon name="briefcase" className="h-4 w-4" />
              {employmentLabel}
            </span>
          )}
          {posted && (
            <span className="job-meta-item">
              <ColorIcon name="clock" className="h-4 w-4" />
              Posted {posted}
            </span>
          )}
          {salary && (
            <span className="job-meta-item">
              <ColorIcon name="banknote" className="h-4 w-4" />
              {salary}
            </span>
          )}
        </div>

        {/* AI match reasoning */}
        <div className="job-reason-panel">
          <div className="job-reason-heading">
            <ColorIcon name="sparkles" className="h-3.5 w-3.5 shrink-0" />
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

        {/* Pinned row: description label on the left, Apply (with "via …") on the
            right. Only the text below it scrolls. */}
        <div className="job-detail-desc-bar">
          {job.description && (
            <h3 className="job-detail-section-heading mb-0">Job description</h3>
          )}
          <div className="job-detail-apply ml-auto">
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
      </div>

      {/* Scrollable body: only the description text scrolls. */}
      {job.description && (
        <div className="job-detail-scroll">
          <p className="job-detail-description">{job.description}</p>
        </div>
      )}
    </div>
  );
}
