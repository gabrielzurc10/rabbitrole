"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { isAuthenticated } from "@/lib/auth";
import { warmUp } from "@/lib/api";

// Auth state changes alongside navigation, so re-evaluate on route change.
const noopSubscribe = () => () => {};

/**
 * Homepage primary CTA. Signed-in users go to their profile; everyone else is
 * sent to sign in first. (The profile page itself routes brand-new users into
 * onboarding.)
 */
export function HeroCta() {
  usePathname();
  const authed = useSyncExternalStore(noopSubscribe, isAuthenticated, () => false);

  // Landing page is the first thing visitors see — start warming the backend now
  // so it's ready by the time they click through and sign in (no cold start).
  useEffect(() => {
    warmUp();
  }, []);
  return (
    <Link href={authed ? "/profile/" : "/login/"} className="btn btn-primary btn-lg">
      Analyze my resume
      <Icon name="arrow-right" className="h-4 w-4" />
    </Link>
  );
}
