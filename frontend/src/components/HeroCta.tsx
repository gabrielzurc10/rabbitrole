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
 * Homepage primary CTA. Signed-in users go to their resume review; everyone else is
 * sent to sign in first. (The resume page itself routes brand-new users into
 * onboarding when they have no profile yet.)
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
    <Link href={authed ? "/resume/" : "/login/"} className="btn btn-primary btn-lg group hover:opacity-100">
      Analyze my resume
      <Icon name="arrow-right" className="icon-nudge-right h-4 w-4" />
    </Link>
  );
}
