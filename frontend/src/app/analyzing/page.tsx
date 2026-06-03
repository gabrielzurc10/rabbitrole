"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { analyzeResume, saveProfile, uploadResume, ApiError } from "@/lib/api";
import { clearOnboardingDraft, getOnboardingDraft } from "@/lib/onboardingDraft";
import { useRequireAuth } from "@/lib/useRequireAuth";

/**
 * Runs the pipeline started from onboarding (or a profile re-analyze): upload the
 * resume, analyze it against the primary role, persist the profile + score, then
 * continue to the profile page. A separate page so the animation has room to breathe.
 */
export default function AnalyzingPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ready) return; // wait until the auth guard confirms a live session
    if (started.current) return; // guard against StrictMode double-invoke
    started.current = true;

    const draft = getOnboardingDraft();
    if (!draft) {
      router.replace("/onboarding");
      return;
    }

    (async () => {
      try {
        const uploaded = await uploadResume(draft.file);
        const primaryRole = draft.profile.targetRoles[0];
        const analysis = await analyzeResume(uploaded.id, primaryRole);
        await saveProfile({
          ...draft.profile,
          resumeId: uploaded.id,
          analysisId: analysis.id,
          score: analysis.score,
        });
        clearOnboardingDraft();
        router.replace("/profile");
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Something went wrong while analyzing.");
      }
    })();
  }, [ready, router]);

  return (
    <div className="page">
      <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center text-center">
        {error ? (
          <>
            <Icon name="alert-triangle" className="h-10 w-10 text-critical" />
            <p className="mt-4 text-critical">{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => router.replace("/onboarding")}>
              Back to onboarding
            </Button>
          </>
        ) : (
          <>
            <div className="relative flex h-28 w-28 items-center justify-center">
              <span className="absolute inset-0 rounded-full border-4 border-muted border-t-primary motion-safe:animate-spin" />
              <Icon name="sparkles" className="h-10 w-10 text-primary motion-safe:animate-pulse" />
            </div>
            <h1 className="mt-6 text-xl font-semibold tracking-tight">Analyzing your resume…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Scoring it against your target role and matching live jobs.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
