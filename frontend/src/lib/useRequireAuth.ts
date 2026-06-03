import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

/**
 * Client-side gate for pages that require a signed-in user.
 *
 * Redirects to /login whenever there's no live session — not only on first mount,
 * but also when the page is restored from the browser's back/forward cache
 * (bfcache), where React effects do NOT re-run. That re-check is the whole point:
 * without it, signing out and pressing Back would show a protected page straight
 * from cache, with the URL still pointing at it.
 *
 * Returns `ready` — true only once a signed-in user has been confirmed in the
 * browser — so a page can hold its data fetch (and its content) until then. That
 * also avoids firing an API call that would just 401 for a logged-out visitor.
 *
 * In demo mode (`npm run dev`, no Cognito) isAuthenticated() is always true, so
 * this never redirects locally.
 */
export function useRequireAuth(): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = () => {
      if (isAuthenticated()) {
        setReady(true);
      } else {
        setReady(false);
        router.replace("/login");
      }
    };
    check();
    // A bfcache restore re-runs no effects, so re-validate on the pageshow event
    // (event.persisted is true only when the page came back from the cache).
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) check();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [router]);

  return ready;
}
