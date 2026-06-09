// Tracks whether the sign-in flow is mid-exchange — i.e. the "Signing you in…" animation
// is showing on /login. The navbar reads this to lock the brand while it's up (so the user
// can't bail mid-sign-in), but keeps it clickable on the normal sign-in form. Broadcast for
// useSyncExternalStore, the same reactive pattern as session.ts / analysisStatus.ts.
let signing = false;
const listeners = new Set<() => void>();

export function setSigningIn(value: boolean): void {
  if (signing === value) return;
  signing = value;
  listeners.forEach((notify) => notify());
}

export function isSigningIn(): boolean {
  return signing;
}

export function subscribeSigningIn(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
