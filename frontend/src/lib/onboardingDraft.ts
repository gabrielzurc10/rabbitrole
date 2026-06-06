// In-memory handoff between the onboarding wizard and the analyzing page.
// The picked File can't be serialized to sessionStorage, so we keep the whole
// draft in module memory. A hard refresh on /analyzing loses it and restarts
// onboarding — acceptable for this MVP.
import type { Profile } from "@/types";

export interface OnboardingDraft {
  profile: Profile;
  file: File;
  /** Where to return on analysis failure (e.g. "/onboarding" or "/profile"). */
  origin?: string;
}

let current: OnboardingDraft | null = null;

export function setOnboardingDraft(draft: OnboardingDraft): void {
  current = draft;
}

export function getOnboardingDraft(): OnboardingDraft | null {
  return current;
}

export function clearOnboardingDraft(): void {
  current = null;
}

// One-shot flag so /analyzing can hand an error back to the page it returns to.
const ANALYZE_ERROR_KEY = "rr.analyzeError";

/** Record that analysis failed (read once by the page we fall back to). */
export function flagAnalyzeError(message: string): void {
  if (typeof window !== "undefined") sessionStorage.setItem(ANALYZE_ERROR_KEY, message);
}

/** Read + clear the analyze-error message, so it shows exactly once. */
export function takeAnalyzeError(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(ANALYZE_ERROR_KEY);
  if (message !== null) sessionStorage.removeItem(ANALYZE_ERROR_KEY);
  return message;
}
