"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAccessToken, logout } from "@/lib/auth";

// localStorage isn't reactive; we re-read auth on each route change instead
// (usePathname below), since auth state only flips alongside a navigation.
const noopSubscribe = () => () => {};

/**
 * Navbar sign-in / sign-out control. The server snapshot is always "signed out"
 * so the static export hydrates cleanly; the client snapshot reads the real
 * token. In local demo mode there's never a token, so it shows "Sign in".
 */
export function AuthButton() {
  usePathname(); // re-evaluate auth after navigation (e.g. once signed in)
  const signedIn = useSyncExternalStore(
    noopSubscribe,
    () => getAccessToken() !== null,
    () => false,
  );

  if (signedIn) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => logout()}>
        Sign out
      </button>
    );
  }
  return (
    <Link href="/login" className="btn btn-primary btn-sm">
      Sign in
    </Link>
  );
}
