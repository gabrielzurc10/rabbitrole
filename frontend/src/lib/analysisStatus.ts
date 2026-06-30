// Tracks an in-flight resume analysis in module scope so it survives navigation
// away from /analyzing. The pipeline (upload -> analyze -> persist) runs here,
// not inside a page effect, so the user can switch tabs while it works: the
// navbar shows a spinner on the Resume tab and the Resume page updates live when
// it finishes. Broadcast via a listener set for useSyncExternalStore, the same
// reactive pattern as session.ts.
import { analyzeResume, saveProfile, uploadResume } from "@/lib/api";
import {
  clearOnboardingDraft,
  clearOnboardingForm,
  flagAnalyzeError,
  type OnboardingDraft,
} from "@/lib/onboardingDraft";
import type { Profile } from "@/types";

export type AnalysisStatus =
  | { phase: "idle" }
  | { phase: "running"; role: string }
  | { phase: "done"; analysisId: string; resumeId: string; role: string }
  | { phase: "error"; message: string; origin: string };

const IDLE: AnalysisStatus = { phase: "idle" };

// Single mutable reference, replaced only on change so getSnapshot stays stable
// for useSyncExternalStore (no re-render loop).
let state: AnalysisStatus = IDLE;
const listeners = new Set<() => void>();

function setState(next: AnalysisStatus): void {
  state = next;
  listeners.forEach((notify) => notify());
}

export function getAnalysisStatus(): AnalysisStatus {
  return state;
}

// Static export renders signed-out HTML — nothing is ever analyzing on the server.
export function getServerAnalysisStatus(): AnalysisStatus {
  return IDLE;
}

export function subscribeAnalysisStatus(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Convenience snapshot for the navbar spinner. */
export function isAnalyzing(): boolean {
  return state.phase === "running";
}

/** Clear a terminal (done/error) state once a page has consumed it. */
export function resetAnalysisStatus(): void {
  if (state.phase !== "running") setState(IDLE);
}

/**
 * Run the resume pipeline: upload the file, analyze it against the primary role,
 * then persist the profile + score. Idempotent while a run is in flight, so a
 * StrictMode double-invoke (or a remount) won't kick off a second run.
 */
export async function startAnalysis(draft: OnboardingDraft): Promise<void> {
  if (state.phase === "running") return;
  const role = draft.profile.targetRoles[0] ?? "";
  setState({ phase: "running", role });
  try {
    const uploaded = await uploadResume(draft.file);
    const analysis = await analyzeResume(uploaded.id, role);
    await saveProfile({
      ...draft.profile,
      resumeId: uploaded.id,
      analysisId: analysis.id,
      score: analysis.score,
    });
    clearOnboardingDraft();
    clearOnboardingForm(); // onboarding complete — drop the persisted wizard inputs
    setState({ phase: "done", analysisId: analysis.id, resumeId: uploaded.id, role });
  } catch {
    // Surface a friendly message on whichever page picks the failure up.
    const message = "Analyzing failed. Please try again.";
    flagAnalyzeError(message);
    setState({ phase: "error", message, origin: draft.origin ?? "/onboarding/" });
  }
}

/**
 * Re-analyze an already-uploaded resume against a new primary role (e.g. when the user
 * changes their primary role in the jobs filter). Drives the same status broadcast as
 * startAnalysis — so the navbar spinner + Resume page show the analyze animation — but
 * reuses the stored resume instead of uploading a file. The given profile's other changes
 * are persisted alongside the fresh analysis. Returns the saved profile.
 */
export async function reanalyzeStored(profile: Profile, role: string): Promise<Profile> {
  if (!profile.resumeId) throw new Error("No resume to re-analyze.");
  setState({ phase: "running", role });
  try {
    const analysis = await analyzeResume(profile.resumeId, role);
    const saved = await saveProfile({
      ...profile,
      analysisId: analysis.id,
      score: analysis.score,
    });
    setState({ phase: "done", analysisId: analysis.id, resumeId: profile.resumeId, role });
    return saved;
  } catch (e) {
    // The caller (jobs filter) shows the error itself — just clear the running state so
    // the navbar spinner stops and no stale error lingers in the store.
    setState(IDLE);
    throw e;
  }
}
