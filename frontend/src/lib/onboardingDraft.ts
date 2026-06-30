// In-memory handoff between the onboarding wizard and the analyzing page.
// The picked File can't be serialized to sessionStorage, so we keep the whole
// draft in module memory. A hard refresh on /analyzing loses it and restarts
// onboarding — acceptable for this MVP.
import type { CityPreference, EmploymentType, Profile } from "@/types";

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

// Serializable snapshot of the wizard's inputs, mirrored to sessionStorage so the
// user's work survives a *full* page reload — notably a forced re-login that bounces
// them out mid-wizard (the access token expired and the silent refresh failed). The
// picked File is the one thing that can't be persisted (File isn't serializable), so
// it's left out and the user re-attaches it on return. sessionStorage (not local)
// keeps it per-tab and short-lived, and survives navigating away to /login and back.
const FORM_KEY = "rr.onboardingForm";

export interface OnboardingForm {
  /** The wizard step the user was on (1-based), so we can land them back near it. */
  step: number;
  fullName: string;
  roles: string[];
  remote: boolean;
  employmentTypes: EmploymentType[];
  cities: CityPreference[];
}

export function saveOnboardingForm(form: OnboardingForm): void {
  if (typeof window !== "undefined") sessionStorage.setItem(FORM_KEY, JSON.stringify(form));
}

export function loadOnboardingForm(): OnboardingForm | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(FORM_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as OnboardingForm;
  } catch {
    return null;
  }
}

/** Drop the saved inputs — on successful onboarding, or on an explicit sign-out. */
export function clearOnboardingForm(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(FORM_KEY);
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
