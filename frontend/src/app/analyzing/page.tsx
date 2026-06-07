"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { analyzeResume, saveProfile, uploadResume } from "@/lib/api";
import { clearOnboardingDraft, getOnboardingDraft, flagAnalyzeError } from "@/lib/onboardingDraft";
import { useRequireAuth } from "@/lib/useRequireAuth";

/**
 * Runs the pipeline started from onboarding (or a profile re-analyze): upload the
 * resume, analyze it against the primary role, persist the profile + score, then
 * continue to the profile page. A separate page so the animation has room to breathe.
 *
 * It's a transient page — only valid while a draft is being processed. On any stray
 * visit (Back onto a completed run, bfcache restore, direct load) it renders nothing
 * and steps the user off it, so it never lingers in history.
 */
export default function AnalyzingPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  const started = useRef(false);

  // Leave this transient page without trapping the user: continue their backward
  // navigation (skipping the stale /analyzing entry), or fall back for a direct load.
  const leave = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.replace("/profile/");
  }, [router]);

  useEffect(() => {
    if (!ready) return; // wait until the auth guard confirms a live session
    if (started.current) return; // guard against StrictMode double-invoke
    started.current = true;

    const draft = getOnboardingDraft();
    if (!draft) {
      leave(); // nothing to do here — step off
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
        // Land on the resume review for the analysis we just produced.
        const review = `/resume/?id=${analysis.id}&resumeId=${uploaded.id}&role=${encodeURIComponent(
          primaryRole,
        )}`;
        router.replace(review);
      } catch {
        // Fall back to the page we came from and surface a friendly message there.
        flagAnalyzeError("Analyzing failed. Please try again.");
        router.replace(draft.origin ?? "/onboarding/");
      }
    })();
  }, [ready, router, leave]);

  // A bfcache restore (or stale Back) re-runs no effects — re-check on pageshow and
  // step off if there's no longer a pipeline running.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted && !getOnboardingDraft()) leave();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [leave]);

  // No active pipeline → show nothing (don't flash the animation on a stray visit).
  if (getOnboardingDraft() === null) return null;

  return (
    <div className="page">
      <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center text-center">
        {/* A white resume "sheet" filling in: skeleton lines shimmering in
            the brand color (see .analyzing-doc / .skeleton-primary). Sized tall
            like a real resume page — a name header + several sections. */}
        <div className="analyzing-doc">
          <div className="skeleton-primary h-5 w-3/5" />
          <div className="skeleton-primary mt-2.5 h-3 w-2/5" />
          {[
            ["w-full", "w-11/12", "w-4/5"],
            ["w-full", "w-5/6", "w-2/3"],
            ["w-full", "w-11/12", "w-3/4"],
            ["w-full", "w-4/5", "w-1/2"],
          ].map((lines, s) => (
            <div key={s} className="mt-5">
              <div className="skeleton-primary h-3 w-1/4" />
              <div className="mt-2.5 space-y-2.5">
                {lines.map((w, i) => (
                  <div key={i} className={`skeleton-primary h-2.5 ${w}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <h1 className="text-shimmer mt-8 text-xl font-semibold tracking-tight">
          Analyzing your resume…
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scoring it against your target role and matching live jobs.
        </p>
      </div>
    </div>
  );
}
