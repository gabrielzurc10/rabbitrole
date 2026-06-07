"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody, CardTitle, CardSubtitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/alert";
import { ScoreSummary } from "@/components/ScoreSummary";
import { TagList } from "@/components/TagList";
import { ResumeCard } from "@/components/ResumeCard";
import { ResumeUploader } from "@/components/ResumeUploader";
import { ResumeReviewSkeleton, ReviewBodySkeleton } from "@/components/Skeleton";
import { getAnalysis, getProfile, peekProfile, ApiError } from "@/lib/api";
import { setOnboardingDraft, takeAnalyzeError } from "@/lib/onboardingDraft";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { Analysis, Profile } from "@/types";

// Flips true after this tab's first mount — see the same pattern in jobs/profile pages.
let hydrated = false;

function ResumeResult() {
  const router = useRouter();
  const params = useSearchParams();
  const ready = useRequireAuth();

  // The review is normally driven by the user's saved profile (this is a nav section),
  // but explicit query params still override it — that's how /analyzing lands here right
  // after producing a fresh analysis, and how older links work.
  const [profile, setProfile] = useState<Profile | null | undefined>(() =>
    hydrated ? peekProfile() : undefined,
  );
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A failed re-analyze (started here, origin "/resume/") sends the user back with a
  // one-shot message. Read it after mount to keep the static-export hydration clean.
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  useEffect(() => {
    const message = takeAnalyzeError();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount read
    if (message) setAnalyzeError(message);
  }, []);

  const analysisId = params.get("id") ?? profile?.analysisId;
  const resumeId = params.get("resumeId") || profile?.resumeId;
  const role = params.get("role") || profile?.targetRoles[0] || analysis?.role || "";

  // Load the profile (cached after onboarding) so the section works without a query param.
  useEffect(() => {
    hydrated = true;
    if (!ready) return;
    getProfile()
      .then((p) => {
        if (p === null) {
          router.replace("/onboarding/"); // signed in but not onboarded yet
          return;
        }
        setProfile(p);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your profile."));
  }, [ready, router]);

  // Load the analysis once we have an id (from the query or the profile).
  useEffect(() => {
    if (!ready || !analysisId) return;
    getAnalysis(analysisId)
      .then(setAnalysis)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load analysis."));
  }, [ready, analysisId]);

  function reAnalyze(file: File) {
    if (!profile) return;
    setOnboardingDraft({ profile, file, origin: "/resume/" });
    router.replace("/analyzing/");
  }

  if (error) {
    return (
      <div className="page">
        <div className="mx-auto max-w-md">
          <ErrorAlert message={error} />
          <Link href="/profile/" className="btn btn-outline mt-4">
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  // Not loaded yet (undefined) or no profile (null, mid-redirect to onboarding) → full
  // skeleton. Once the profile is in, the resume + upload cards can render immediately
  // (they only need the profile); only the analysis-derived body waits.
  if (!profile) {
    return (
      <div className="page">
        <ResumeReviewSkeleton />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resume review</h1>
          {role && (
            <p className="mt-1 text-sm text-muted-foreground">
              Reviewed for <span className="font-medium text-foreground">{role}</span>
            </p>
          )}
        </div>

        {analyzeError && <ErrorAlert message={analyzeError} />}

        {/* Score ring + filename + View/Download. No analysisId prop → no self-link. */}
        <ResumeCard resumeId={resumeId} score={analysis?.score ?? profile.score ?? 0} role={role} />

        <Card>
          <CardBody className="space-y-3">
            <CardTitle>Update your resume</CardTitle>
            <CardSubtitle>Upload a new version to re-score it.</CardSubtitle>
            <ResumeUploader onFile={reAnalyze} />
          </CardBody>
        </Card>

        {analysis ? (
          <>
            <ScoreSummary counts={analysis.counts} />
            <div>
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Suggested improvements</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Click any tag to see why it matters and a suggested replacement.
              </p>
              <TagList tags={analysis.tags} />
            </div>
          </>
        ) : (
          <ReviewBodySkeleton />
        )}
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
