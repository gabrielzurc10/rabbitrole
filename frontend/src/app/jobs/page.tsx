"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ErrorAlert } from "@/components/ui/alert";
import { JobCard } from "@/components/JobCard";
import { JobFilterPanel } from "@/components/JobFilterPanel";
import { Collapse } from "@/components/Collapse";
import { EMPLOYMENT_LABELS } from "@/components/EmploymentTypeSelector";
import { JobsSkeleton } from "@/components/Skeleton";
import {
  getJobsForMe,
  peekJobs,
  cacheJobs,
  getProfile,
  peekProfile,
  saveProfile,
  ApiError,
} from "@/lib/api";
import { reanalyzeStored } from "@/lib/analysisStatus";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { cn } from "@/lib/cn";
import type { Job, Profile } from "@/types";

/** True when the failure is the profile referencing a resume that no longer exists. */
function isMissingResume(e: unknown): boolean {
  return e instanceof ApiError && /no resume found/i.test(e.message);
}

/** Jobs shown (and loaded more) in pages of this size. */
const PAGE = 10;

// Flips true after this tab's first mount. Module-scoped (survives remounts) so a
// client-side tab switch can seed from the cache instantly, while the very first
// render after a full page load still matches the server-prerendered skeleton —
// reading sessionStorage during that initial render would diverge from the static
// HTML and trip a hydration mismatch (React #418).
let hydrated = false;

export default function JobsPage() {
  const router = useRouter();
  const ready = useRequireAuth();

  // Seed from the cached paginated view so switching back to this tab restores the
  // loaded pages instantly — but only past the initial hydration (see `hydrated`).
  const cached = hydrated ? peekJobs() : undefined;
  const [jobs, setJobs] = useState<Job[] | null>(() => (cached ? cached.jobs : null));
  const [visible, setVisible] = useState(() => (cached ? cached.jobs.length : PAGE));
  const [nextPage, setNextPage] = useState(() => (cached ? cached.nextPage : 1));
  const [done, setDone] = useState(() => (cached ? cached.done : false));

  const [profile, setProfile] = useState<Profile | null>(() =>
    hydrated ? (peekProfile() ?? null) : null,
  );
  const [error, setError] = useState<string | null>(null);
  // The profile points at a resume the backend no longer has (e.g. it was deleted) — show
  // a friendly upload prompt instead of leaking the raw "No resume found for id …" error.
  const [needsResume, setNeedsResume] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Apply a fresh page-0 result (initial load or after a filter change).
  const setFirstPage = useCallback((list: Job[]) => {
    setJobs(list);
    setVisible(PAGE);
    setNextPage(1);
    setDone(list.length === 0);
    cacheJobs({ jobs: list, nextPage: 1, done: list.length === 0 });
  }, []);

  useEffect(() => {
    hydrated = true;
    if (!ready) return; // wait until the auth guard confirms a live session
    // Already restored from the cache → don't refetch on a tab switch.
    if (jobs === null) {
      getJobsForMe(0)
        .then((result) => {
          if (result === null) {
            router.replace("/onboarding/"); // not onboarded yet (204 from the API)
            return;
          }
          setFirstPage(result);
        })
        .catch((e) => {
          if (isMissingResume(e)) setNeedsResume(true);
          else setError(e instanceof ApiError ? e.message : "Could not load jobs.");
        });
    }
    // Load the profile too (cached after onboarding) so the filter can pre-fill.
    getProfile()
      .then((p) => setProfile(p))
      .catch(() => {}); // a miss isn't fatal — the filter button just stays hidden
  }, [ready, router, jobs, setFirstPage]);

  // Infinite scroll: reveal the next 10 from what's already loaded, else fetch the
  // next backend page. Stops once a page comes back empty.
  const loadMore = useCallback(async () => {
    if (loadingMore || !jobs) return;
    if (visible < jobs.length) {
      setVisible((v) => Math.min(v + PAGE, jobs.length));
      return;
    }
    if (done) return;
    setLoadingMore(true);
    try {
      const next = await getJobsForMe(nextPage);
      if (!next || next.length === 0) {
        setDone(true);
        cacheJobs({ jobs, nextPage, done: true });
        return;
      }
      // Dedupe across pages so React keys stay unique.
      const seen = new Set(jobs.map((j) => j.id));
      const merged = [...jobs, ...next.filter((j) => !seen.has(j.id))];
      setJobs(merged);
      setVisible((v) => v + PAGE);
      setNextPage((p) => p + 1);
      cacheJobs({ jobs: merged, nextPage: nextPage + 1, done: false });
    } catch {
      // A failed load-more isn't fatal — scrolling again retries.
    } finally {
      setLoadingMore(false);
    }
  }, [jobs, visible, done, nextPage, loadingMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  // Persist the adjusted preferences, then re-fetch matches from page 0.
  async function handleApply(updated: Profile) {
    const previous = profile;
    setApplying(true);
    setError(null);
    // Optimistically reflect the applied values: the panel re-seeds from `profile` on
    // each (re)mount, so without this, closing and reopening it mid-apply would snap the
    // fields back to the old profile. Rolled back below if the save fails.
    setProfile(updated);
    try {
      // Persist the new role/preferences first so they propagate immediately (the cache
      // updates here, before the slow re-analysis).
      const saved = await saveProfile(updated);
      // The resume is scored against the primary role (targetRoles[0]). If it changed,
      // kick the re-analysis off right away — before fetching jobs — so the analyzer runs
      // as soon as the filter is applied (the analyze animation shows on the Resume tab).
      const newPrimary = saved.targetRoles[0];
      if (newPrimary && newPrimary !== previous?.targetRoles[0] && saved.resumeId) {
        void reanalyzeStored(saved, newPrimary).catch(() => {});
      }
      const fresh = await getJobsForMe(0);
      setProfile(saved);
      setFirstPage(fresh ?? []);
      setFilterOpen(false);
    } catch (e) {
      setProfile(previous); // save failed — undo the optimistic change
      if (isMissingResume(e)) setNeedsResume(true);
      else setError(e instanceof ApiError ? e.message : "Could not apply filters.");
    } finally {
      setApplying(false);
    }
  }

  const hasMore = Boolean(jobs && (visible < jobs.length || !done));

  return (
    <div className="page">
      <div className="mx-auto max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Matched jobs</h1>
          <p className="mt-1 text-muted-foreground">
            Live postings matched to your preferences, ranked by your resume.
          </p>
        </div>

        {profile && (
          <div className="mt-3 flex items-start justify-between gap-3">
            {/* A read-only summary of the active filters (edit them via Filter). */}
            <div className="flex flex-wrap gap-2">
              {profile.targetRoles.map((r) => (
                <span key={`role-${r}`} className="badge badge-primary">
                  {r}
                </span>
              ))}
              {profile.remote ? (
                <span className="badge badge-primary">
                  <Icon name="monitor" className="h-3.5 w-3.5" />
                  Remote
                </span>
              ) : (
                profile.cities.map((c, i) => (
                  <span key={`city-${i}`} className="badge badge-primary">
                    <Icon name="map-pin" className="h-3.5 w-3.5" />
                    {c.city}, {c.state}
                  </span>
                ))
              )}
              {profile.employmentTypes.map((t) => (
                <span key={`emp-${t}`} className="badge badge-primary">
                  {EMPLOYMENT_LABELS[t]}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen((open) => !open)}
              aria-expanded={filterOpen}
              className="btn btn-outline btn-md group shrink-0 dark:bg-muted dark:hover:bg-border"
            >
              <Icon name="sliders" className="icon-nudge-up h-4 w-4" />
              Filter
              <Icon
                name="chevron-down"
                className={cn("h-4 w-4 transition-transform", filterOpen && "rotate-180")}
              />
            </button>
          </div>
        )}

        {profile && (
          <Collapse open={filterOpen}>
            {/* Margin lives on the inner content so it collapses away with the panel. */}
            <div className="mt-6">
              <JobFilterPanel profile={profile} applying={applying} onApply={handleApply} />
            </div>
          </Collapse>
        )}

        {error && (
          <div className="mt-6">
            <ErrorAlert message={error} />
          </div>
        )}

        {needsResume && (
          <div className="mt-12 flex flex-col items-center text-center text-muted-foreground">
            <Icon name="file-text" className="h-10 w-10" />
            <p className="mt-3">Upload a resume to see jobs matched to you.</p>
            <Link href="/resume/" className="btn btn-primary btn-sm group mt-4 hover:opacity-100">
              <Icon name="upload" className="icon-nudge-up h-4 w-4" />
              Upload resume
            </Link>
          </div>
        )}

        {!error && !needsResume && (applying || !jobs) && <JobsSkeleton />}

        {!applying && jobs && jobs.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center text-muted-foreground">
            <Icon name="briefcase" className="h-10 w-10" />
            <p className="mt-3">No postings found for your preferences right now.</p>
          </div>
        )}

        {!applying && jobs && jobs.length > 0 && (
          <>
            <div className="mt-6 space-y-3">
              {jobs.slice(0, visible).map((job, i) => (
                <div
                  key={job.id}
                  className="motion-safe:animate-[slide-up_0.4s_ease-out_both]"
                  style={{ animationDelay: `${(i % PAGE) * 50}ms` }}
                >
                  <JobCard job={job} />
                </div>
              ))}
            </div>

            {/* Sentinel: scrolling it into view triggers the next page. */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                {loadingMore && (
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary"
                    aria-label="Loading more jobs"
                    role="status"
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
