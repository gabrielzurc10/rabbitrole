"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { isOnboarded, subscribeOnboarded } from "@/lib/session";

/**
 * The Jobs/Profile tabs, shown only once the user is signed in AND has
 * completed onboarding (has a profile). The onboarded flag is set by the
 * profile/jobs API calls and broadcast, so the tabs appear/disappear live.
 * Server snapshot is "hidden" so the static export hydrates cleanly.
 */
export function NavTabs() {
  usePathname(); // also re-evaluate on navigation (e.g. right after sign-in)
  const show = useSyncExternalStore(
    subscribeOnboarded,
    () => isAuthenticated() && isOnboarded(),
    () => false,
  );
  if (!show) return null;
  return (
    <>
      <Link href="/jobs" className="btn btn-ghost btn-sm">
        Jobs
      </Link>
      <Link href="/profile" className="btn btn-ghost btn-sm">
        Profile
      </Link>
    </>
  );
}
