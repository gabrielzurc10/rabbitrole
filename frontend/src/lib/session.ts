// Tracks whether the signed-in user has completed onboarding (has a profile),
// so the Jobs/Profile tabs only appear post-onboarding. Persisted in
// localStorage and broadcast via an event so the navbar updates reactively.
// The flag is set as a side effect of the profile/jobs API calls (see lib/api).

const KEY = "rr.onboarded";
const EVENT = "rr-onboarded";

// Per-tab caches of the signed-in user's data (written by lib/api). Kept in
// sessionStorage so they survive a hard navigation/reload within the tab — e.g.
// a tab switch that reloads the page on the static-export site, where module
// memory is dropped — so we don't re-pull from the DB. The keys live here so
// sign-out can clear them (below) without a circular import back into lib/api.
export const PROFILE_CACHE_KEY = "rr.profile";
export const JOBS_CACHE_KEY = "rr.jobs";
export const TOP_MATCHES_CACHE_KEY = "rr.topmatches";
export const RESUME_CACHE_KEY = "rr.resumes";
export const ANALYSIS_CACHE_KEY = "rr.analyses";

export function setOnboarded(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) {
    localStorage.setItem(KEY, "1");
  } else {
    localStorage.removeItem(KEY);
    // Signing out / no profile: drop the cached data so it can't leak to the
    // next user who signs in on this same tab.
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
    sessionStorage.removeItem(JOBS_CACHE_KEY);
    sessionStorage.removeItem(TOP_MATCHES_CACHE_KEY);
    sessionStorage.removeItem(RESUME_CACHE_KEY);
    sessionStorage.removeItem(ANALYSIS_CACHE_KEY);
  }
  window.dispatchEvent(new Event(EVENT));
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

/** Subscribe to onboarding-status changes (for useSyncExternalStore). */
export function subscribeOnboarded(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
