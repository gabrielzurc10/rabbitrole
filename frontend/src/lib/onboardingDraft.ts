// In-memory handoff between the onboarding wizard and the analyzing page.
// The picked File can't be serialized to sessionStorage, so we keep the whole
// draft in module memory. A hard refresh on /analyzing loses it and restarts
// onboarding — acceptable for this MVP.
import type { Profile } from "@/types";

export interface OnboardingDraft {
  profile: Profile;
  file: File;
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
