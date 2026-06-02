// Tracks whether the signed-in user has completed onboarding (has a profile),
// so the Jobs/Profile tabs only appear post-onboarding. Persisted in
// localStorage and broadcast via an event so the navbar updates reactively.
// The flag is set as a side effect of the profile/jobs API calls (see lib/api).

const KEY = "rr.onboarded";
const EVENT = "rr-onboarded";

export function setOnboarded(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) {
    localStorage.setItem(KEY, "1");
  } else {
    localStorage.removeItem(KEY);
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
