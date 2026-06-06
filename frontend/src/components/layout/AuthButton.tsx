"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthenticated, logout } from "@/lib/auth";

// localStorage isn't reactive; we re-read auth on each route change instead
// (usePathname below), since auth state only flips alongside a navigation.
const noopSubscribe = () => () => {};

/**
 * Navbar sign-in / sign-out control. Uses the same `isAuthenticated()` notion as
 * the nav tabs + landing CTA, so it stays in sync (incl. demo mode, where the app
 * treats you as signed in). Hidden on /login — you're mid sign-in there, so a nav
 * button would be redundant.
 *
 * The site is a static export built signed-out, so the prerendered HTML contains
 * a "Sign in" button. On refresh the browser paints that before JS reads
 * localStorage and flips it to "Sign out" — a visible flash. The `mounted` gate
 * holds a neutral, space-reserving placeholder until the real auth state is known,
 * so the wrong button never shows.
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
  if (pathname === "/login") return null;

  // Pre-hydration: reserve the button's footprint (invisible) so resolving the real
  // state doesn't shift the layout — and crucially shows no wrong label.
  if (!mounted) {
    return (
      <span className="btn btn-ghost btn-sm invisible" aria-hidden="true">
        Sign in
      </span>
    );
  }

  if (signedIn) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => logout()}>
        Sign out
      </button>
    );
  }
  return (
    <Link href="/login/" className="btn btn-primary btn-sm">
      Sign in
    </Link>
  );
}
