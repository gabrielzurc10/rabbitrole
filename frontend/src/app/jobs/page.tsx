"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ErrorAlert } from "@/components/ui/alert";
import { JobCard } from "@/components/JobCard";
import { JobFilterPanel } from "@/components/JobFilterPanel";
import { EMPLOYMENT_LABELS } from "@/components/EmploymentTypeSelector";
import { JobsSkeleton } from "@/components/Skeleton";
import { getJobsForMe, peekJobs, getProfile, peekProfile, saveProfile, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { cn } from "@/lib/cn";
import type { Job, Profile } from "@/types";

// Flips true after this tab's first mount. Module-scoped (survives remounts) so a
// client-side tab switch can seed from the cache instantly, while the very first
// render after a full page load still matches the server-prerendered skeleton —
// reading sessionStorage during that initial render would diverge from the static
// HTML and trip a hydration mismatch (React #418).
let hydrated = false;

export default function JobsPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  // Seed from the cache so switching back to this tab shows the jobs instantly,
  // with no refetch or skeleton flash — but only once past the initial hydration
  // (see `hydrated` above); a full refresh starts from the skeleton.
  const [jobs, setJobs] = useState<Job[] | null>(() => {
    if (!hydrated) return null;
    const cached = peekJobs();
    return Array.isArray(cached) ? cached : null;
  });
  // The profile seeds the filter panel; same hydration-safe cache scheme as jobs.
  const [profile, setProfile] = useState<Profile | null>(() =>
    hydrated ? (peekProfile() ?? null) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    hydrated = true;
    if (!ready) return; // wait until the auth guard confirms a live session
    // getJobsForMe() returns the cache without a network call when it's warm, so
    // this both seeds after a full reload and fetches on a cold start. The async
    // .then keeps the set off the synchronous effect path.
    getJobsForMe()
      .then((result) => {
        if (result === null) {
          router.replace("/onboarding/"); // not onboarded yet (204 from the API)
          return;
        }
        setJobs(result);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Could not load jobs.");
      });
    // Load the profile too (cached after onboarding) so the filter can pre-fill.
    getProfile()
      .then((p) => setProfile(p))
      .catch(() => {}); // a miss isn't fatal — the filter button just stays hidden
  }, [ready, router]);

  // Persist the adjusted preferences, then re-fetch matches. saveProfile()
  // invalidates the jobs cache, so getJobsForMe() makes a fresh request.
  async function handleApply(updated: Profile) {
    const previous = profile;
    setApplying(true);
    setError(null);
    // Optimistically reflect the applied values: the panel re-seeds from `profile` on
    // each (re)mount, so without this, closing and reopening it mid-apply would snap the
    // fields back to the old profile. Rolled back below if the save fails.
    setProfile(updated);
    try {
      const saved = await saveProfile(updated);
      const fresh = await getJobsForMe();
      setProfile(saved);
      setJobs(fresh ?? []);
      setFilterOpen(false);
    } catch (e) {
      setProfile(previous); // save failed — undo the optimistic change
      setError(e instanceof ApiError ? e.message : "Could not apply filters.");
    } finally {
      setApplying(false);
    }
  }

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
                <span key={`role-${r}`} className="badge badge-neutral">
                  {r}
                </span>
              ))}
              {profile.remote ? (
                <span className="badge badge-neutral">
                  <Icon name="monitor" className="h-3.5 w-3.5" />
                  Remote eligible
                </span>
              ) : (
                profile.cities.map((c, i) => (
                  <span key={`city-${i}`} className="badge badge-neutral">
                    <Icon name="map-pin" className="h-3.5 w-3.5" />
                    {c.city}, {c.state}
                  </span>
                ))
              )}
              {profile.employmentTypes.map((t) => (
                <span key={`emp-${t}`} className="badge badge-neutral">
                  {EMPLOYMENT_LABELS[t]}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen((open) => !open)}
              aria-expanded={filterOpen}
              className="btn btn-outline btn-md shrink-0 dark:bg-muted dark:hover:bg-border"
            >
              <Icon name="sliders" className="h-4 w-4" />
              Filter
              <Icon
                name="chevron-down"
                className={cn("h-4 w-4 transition-transform", filterOpen && "rotate-180")}
              />
            </button>
          </div>
        )}

        {profile && filterOpen && (
          <div className="mt-6 motion-safe:animate-[slide-up_0.2s_ease-out]">
            <JobFilterPanel profile={profile} applying={applying} onApply={handleApply} />
          </div>
        )}

        {error && (
          <div className="mt-6">
            <ErrorAlert message={error} />
          </div>
        )}

        {!error && (applying || !jobs) && <JobsSkeleton />}

        {!applying && jobs && jobs.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center text-muted-foreground">
            <Icon name="briefcase" className="h-10 w-10" />
            <p className="mt-3">No postings found for your preferences right now.</p>
          </div>
        )}

        {!applying && jobs && jobs.length > 0 && (
          <div className="mt-6 space-y-3">
            {jobs.map((job, i) => (
              <div
                key={job.id}
                className="motion-safe:animate-[slide-up_0.4s_ease-out_both]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <JobCard job={job} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
