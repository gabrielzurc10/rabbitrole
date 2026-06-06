"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ErrorAlert } from "@/components/ui/alert";
import { ScoreSummary } from "@/components/ScoreSummary";
import { TagList } from "@/components/TagList";
import { MatchRing } from "@/components/MatchRing";
import { ResumeReviewSkeleton } from "@/components/Skeleton";
import { getAnalysis, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { Analysis } from "@/types";

function ResumeResult() {
  const params = useSearchParams();
  const ready = useRequireAuth();
  const id = params.get("id");
  const resumeId = params.get("resumeId") ?? "";
  const role = params.get("role") ?? "";

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !id) return; // wait until the auth guard confirms a live session
    getAnalysis(id)
      .then(setAnalysis)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Could not load analysis."),
      );
  }, [ready, id]);

  if (!id || error) {
    return (
      <div className="page">
        <div className="mx-auto max-w-md">
          <ErrorAlert message={error ?? "No analysis id provided."} />
          <Link href="/profile/" className="btn btn-outline mt-4">
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="page">
        <ResumeReviewSkeleton />
      </div>
    );
  }

  const jobsHref = `/jobs/?role=${encodeURIComponent(role || analysis.role)}${
    resumeId ? `&resumeId=${resumeId}` : ""
  }`;

  return (
    <div className="page">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <MatchRing percent={analysis.score} size={72} />
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <Icon name="file-text" className="text-primary" />
                Resume review
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Reviewed for{" "}
                <span className="font-medium text-foreground">{analysis.role}</span>
              </p>
            </div>
          </div>
          <Link href={jobsHref} className="btn btn-outline btn-sm">
            <Icon name="briefcase" className="h-4 w-4" />
            View matched jobs
          </Link>
        </div>

        <div className="mt-6">
          <ScoreSummary counts={analysis.counts} />
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            Suggested improvements
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Click any tag to see why it matters and a suggested replacement.
          </p>
          <TagList tags={analysis.tags} />
        </div>
      </div>
    </div>
  );
}

export default function ResumePage() {
  // useSearchParams needs a Suspense boundary under static export.
  return (
    <Suspense
      fallback={
        <div className="page">
          <ResumeReviewSkeleton />
        </div>
      }
    >
      <ResumeResult />
    </Suspense>
  );
}
