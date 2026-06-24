"use client";

import { Job } from "@/types";
import { MatchRing } from "@/components/MatchRing";
import { EMPLOYMENT_LABELS } from "@/components/EmploymentTypeSelector";
import { Icon } from "@/components/ui/icon";
import { ColorIcon } from "@/components/ui/color-icon";
import { matchLabel, matchTone } from "@/lib/match";
import { formatSalary, formatPosted } from "@/lib/jobFormat";
import { cn } from "@/lib/cn";

/**
 * A posting in the list. Clicking (or Enter/Space) selects it, surfacing the full
 * detail — description + AI match reasoning — in the side panel (desktop) or bottom
 * sheet (mobile). The card itself stays a compact summary; Apply is a nested link
 * that stops propagation so it doesn't also trigger selection.
 */
export function JobCard({
  job,
  selected = false,
  onSelect,
}: {
  job: Job;
  selected?: boolean;
  onSelect?: (job: Job) => void;
}) {
  // Prefer the clean parsed city/state; fall back to the raw location string.
  const location = [job.city, job.state].filter(Boolean).join(", ") || job.location;
  const isRemote = job.workMode === "remote";
  const employmentLabel = job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null;
  const salary = formatSalary(job);
  const posted = formatPosted(job.postedAt);
  const hasMeta = Boolean(isRemote || location || employmentLabel || salary || posted);
  const tone = matchTone(job.matchPercent);

  function select() {
    onSelect?.(job);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={select}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select();
        }
      }}
      className={cn("job-card", selected && "job-card-selected")}
    >
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
                  <ColorIcon name="map-pin" className="h-4 w-4" />
                  {location}
                </span>
              )}
              {isRemote && (
                <span className="job-meta-item col-start-2 row-start-1 justify-self-center">
                  <ColorIcon name="monitor" className="h-4 w-4" />
                  Remote
                </span>
              )}
              {employmentLabel && (
                <span className="job-meta-item col-start-3 row-start-1 justify-self-end">
                  <ColorIcon name="briefcase" className="h-4 w-4" />
                  {employmentLabel}
                </span>
              )}
              {posted && (
                <span className="job-meta-item col-start-1 row-start-2">
                  <ColorIcon name="clock" className="h-4 w-4" />
                  Posted {posted}
                </span>
              )}
              {salary && (
                <span className="job-meta-item col-start-3 row-start-2 justify-self-end">
                  <ColorIcon name="banknote" className="h-4 w-4" />
                  {salary}
                </span>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="job-card-rule" />
        <div className="job-card-actions">
          <div className="flex shrink-0 items-center gap-3">
            {job.publisher && (
              <span className="truncate text-xs text-muted-foreground">via {job.publisher}</span>
            )}
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn btn-primary btn-sm group"
            >
              Apply
              <Icon name="arrow-right" className="icon-nudge-right h-4 w-4" />
            </a>
          </div>
        </div>
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
