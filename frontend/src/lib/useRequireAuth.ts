import { useEffect, useState } from "react";
import { getValidAccessToken, isAuthenticated, isConfigured } from "@/lib/auth";

/**
 * Verify there's a *live* session, not just stored tokens. isAuthenticated() only
 * estimates the refresh token is still good (a 30-day guess, never checked against
 * Cognito), so a long-dead session passes it — and is only caught later when a real
 * API call tries to refresh, fails, clears the tokens, and bounces the user. Here we
 * actually attempt that refresh up front: getValidAccessToken() returns a token only
 * if the access token is valid OR a refresh genuinely succeeds, so a revoked/expired
 * session resolves to null and we redirect immediately — before the user does any work.
 * As a bonus it leaves a fresh access token in place, so the page's first API call
 * (e.g. the analyze pipeline) doesn't have to refresh mid-flight.
 */
async function hasLiveSession(): Promise<boolean> {
  if (!isConfigured) return isAuthenticated(); // demo mode: local "signed out" flag only
  if (!isAuthenticated()) return false; // no tokens at all — skip the network round-trip
  return (await getValidAccessToken()) !== null;
}

/**
 * Client-side gate for pages that require a signed-in user.
 *
 * Redirects to /login whenever there's no live session — not only on first mount,
 * but also when the page is restored from the browser's back/forward cache
 * (bfcache), where React effects do NOT re-run. That re-check is the whole point:
 * without it, signing out and pressing Back would show a protected page straight
 * from cache, with the URL still pointing at it.
 *
 * Returns `ready` — true only once a live session has been confirmed in the browser
 * (see hasLiveSession) — so a page can hold its data fetch (and its content) until
 * then. That also avoids firing an API call that would just 401 for a logged-out
 * visitor, or kick off the analyze pipeline on a session that's about to be wiped.
 *
 * In demo mode (`npm run dev`, no Cognito) isAuthenticated() is always true, so
 * this never redirects locally.
 */
export function useRequireAuth(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      void hasLiveSession().then((live) => {
        if (cancelled) return; // page unmounted while the refresh was in flight
        if (live) {
          setReady(true);
        } else {
          setReady(false);
          // Hard redirect, NOT router.replace: after sign-out + Back, the page can be
          // restored from the bfcache with a stale Next router where a client-side
          // navigation silently no-ops. A full-page replace always evicts it (and
          // doesn't grow history).
          window.location.replace("/login/");
        }
      });
    };
    check();
    // A bfcache restore re-runs no effects, so re-validate on the pageshow event
    // (event.persisted is true only when the page came back from the cache).
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) check();
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  return ready;
}
