"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnalyzingDoc } from "@/components/AnalyzingDoc";
import { getOnboardingDraft, loadPersistedDraft } from "@/lib/onboardingDraft";
import {
  getAnalysisStatus,
  getServerAnalysisStatus,
  resetAnalysisStatus,
  startAnalysis,
  subscribeAnalysisStatus,
} from "@/lib/analysisStatus";
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
  const status = useSyncExternalStore(
    subscribeAnalysisStatus,
    getAnalysisStatus,
    getServerAnalysisStatus,
  );

  // Leave this transient page without trapping the user: continue their backward
  // navigation (skipping the stale /analyzing entry), or fall back for a direct load.
  const leave = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.replace("/profile/");
  }, [router]);

  // Kick off the pipeline once auth is ready. It runs in the analysisStatus store,
  // not here, so it keeps going if the user navigates away mid-analysis.
  useEffect(() => {
    if (!ready) return; // wait until the auth guard confirms a live session
    if (started.current) return; // guard against StrictMode double-invoke
    started.current = true;

    let cancelled = false;
    void (async () => {
      // Module memory is the fast path; fall back to the durable copy when a full
      // reload between /onboarding and /analyzing dropped it (else we'd bounce off).
      const draft = getOnboardingDraft() ?? (await loadPersistedDraft());
      if (cancelled) return;
      if (!draft) {
        leave(); // nothing to do here — step off
        return;
      }
      startAnalysis(draft);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, leave]);

  // React to completion *while this page is still mounted*: go to the fresh review,
  // or back to the origin on failure. If the user navigated away, this effect is
  // gone and no redirect fires — the Resume tab/page reflect the result instead.
  useEffect(() => {
    if (status.phase === "done") {
      const review = `/resume/?id=${status.analysisId}&resumeId=${status.resumeId}&role=${encodeURIComponent(
        status.role,
      )}`;
      resetAnalysisStatus();
      router.replace(review);
    } else if (status.phase === "error") {
      const { origin } = status;
      resetAnalysisStatus();
      router.replace(origin);
    }
  }, [status, router]);

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
  if (getOnboardingDraft() === null && status.phase !== "running") return null;

  return (
    <div className="page">
      <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center text-center">
        <AnalyzingDoc />
        <h1 className="mt-8 text-xl font-semibold tracking-tight">
          Analyzing your resume…
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scoring it against your target role and matching live jobs.
        </p>
      </div>
    </div>
  );
}
