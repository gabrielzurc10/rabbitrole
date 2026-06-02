"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { JobCard } from "@/components/JobCard";
import { getJobsForMe, ApiError } from "@/lib/api";
import type { Job } from "@/types";

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJobsForMe()
      .then(setJobs)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          router.replace("/onboarding"); // not onboarded yet
          return;
        }
        setError(e instanceof ApiError ? e.message : "Could not load jobs.");
      });
  }, [router]);

  return (
    <div className="page">
      <div className="mx-auto max-w-3xl">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Icon name="briefcase" className="text-primary" />
          Matched jobs
        </h1>
        <p className="mt-1 text-muted-foreground">
          Live postings matched to your preferences, ranked by your resume.
        </p>

        {error && <p className="mt-6 text-center text-critical">{error}</p>}

        {!error && !jobs && (
          <p className="mt-6 text-center text-muted-foreground">Loading jobs…</p>
        )}

        {jobs && jobs.length === 0 && (
          <p className="mt-6 text-center text-muted-foreground">
            No postings found for your preferences right now.
          </p>
        )}

        {jobs && jobs.length > 0 && (
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
