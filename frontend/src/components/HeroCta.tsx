"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { isAuthenticated } from "@/lib/auth";

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

  return (
    <Link href={authed ? "/resume/" : "/login/"} className="btn btn-primary btn-lg group hover:opacity-100">
      Analyze my resume
      <Icon name="arrow-right" className="icon-nudge-right h-4 w-4" />
    </Link>
  );
}
