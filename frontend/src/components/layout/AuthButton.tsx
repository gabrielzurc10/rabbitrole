"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { isAuthenticated, logout } from "@/lib/auth";

// localStorage isn't reactive; we re-read auth on each route change instead
// (usePathname below), since auth state only flips alongside a navigation.
const noopSubscribe = () => () => {};

/**
 * Navbar sign-in control. Shows "Sign in" when signed out. Signing OUT normally lives
 * on the profile page, so this renders nothing once signed in — EXCEPT during onboarding,
 * where there's no profile page yet, so it surfaces "Sign out" so a mid-onboarding user
 * can still get out. Uses the same `isAuthenticated()` notion as the nav tabs + landing
 * CTA (incl. demo mode). Hidden on /login — you're mid sign-in there.
 *
 * The site is a static export built signed-out, so the prerendered HTML contains a
 * "Sign in" button. On refresh the browser paints that before JS reads localStorage — a
 * visible flash. The `mounted` gate holds a neutral, space-reserving placeholder until
 * the real auth state is known, so the wrong button never shows.
 */
export function AuthButton() {
  const pathname = usePathname();
  const signedIn = useSyncExternalStore(noopSubscribe, isAuthenticated, () => false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount gate
    setMounted(true);
  }, []);

  // While signing in, the navbar shouldn't offer "Sign in" (or a premature "Sign out").
  // The static export uses trailing slashes, so pathname is "/login/".
  if (pathname.startsWith("/login")) return null;

  // Pre-hydration: reserve the button's footprint (invisible) so resolving the real
  // state doesn't shift the layout — and crucially shows no wrong label.
  if (!mounted) {
    return (
      <span className="btn btn-ghost btn-sm invisible" aria-hidden="true">
        <Icon name="log-in" className="h-4 w-4" />
        Sign in
      </span>
    );
  }

  // Signed in: sign-out lives on the profile page, so the navbar shows nothing —
  // unless we're in onboarding, which has no profile page yet.
  if (signedIn) {
    if (pathname.startsWith("/onboarding")) {
      return (
        <button
          className="btn btn-sm group text-foreground"
          onClick={() => logout()}
        >
          <Icon name="log-out" className="icon-nudge-right h-4 w-4" />
          Sign out
        </button>
      );
    }
    return null;
  }
  return (
    <Link href="/login/" className="btn btn-primary btn-sm group hover:opacity-100">
      <Icon name="log-in" className="icon-nudge-right h-4 w-4" />
      Sign in
    </Link>
  );
}
