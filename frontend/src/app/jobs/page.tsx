"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { JobCard } from "@/components/JobCard";
import { getJobs, ApiError } from "@/lib/api";
import type { Job } from "@/types";

function JobsResult() {
  const params = useSearchParams();
  const role = params.get("role") ?? "";
  const resumeId = params.get("resumeId") ?? undefined;

  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!role) return;
    getJobs(role, resumeId)
      .then(setJobs)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Could not load jobs."),
      );
  }, [role, resumeId]);

  const missingRole = !role;

  return (
    <div className="page">
      <div className="mx-auto max-w-3xl">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Icon name="briefcase" className="text-primary" />
          Matched jobs
        </h1>
        <p className="mt-1 text-muted-foreground">
          {role ? (
            <>
              <span className="font-medium text-foreground">{role}</span> roles
              {resumeId ? " ranked by match with your resume." : "."}
            </>
          ) : (
            "Live job postings for your target role."
          )}
        </p>

        {(missingRole || error) && (
          <div className="mt-6 text-center">
            <p className="text-critical">
              {error ?? "No role provided. Analyze a resume first."}
            </p>
            <Link href="/dashboard" className="btn btn-outline mt-4">
              Back to upload
            </Link>
          </div>
        )}

        {!missingRole && !error && !jobs && (
          <p className="mt-6 text-center text-muted-foreground">Loading jobs…</p>
        )}

        {jobs && jobs.length === 0 && (
          <p className="mt-6 text-center text-muted-foreground">
            No postings found for this role right now.
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

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <p className="text-center text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <JobsResult />
    </Suspense>
  );
}
