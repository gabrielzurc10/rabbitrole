"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { isOnboarded, subscribeOnboarded } from "@/lib/session";

// Auth only flips alongside navigation, so a no-op subscribe (re-read each render)
// is enough — same pattern as HeroCta.
const noopSubscribe = () => () => {};

/**
 * Wraps the landing page. Signed-in users don't need the marketing page, so send
 * them into the app: onboarded users to Jobs, everyone else to onboarding.
 * Signed-out visitors get the landing content as normal.
 *
 * The site is a static export prerendered signed-out, so the landing HTML must
 * still render by default (SEO + instant paint for the common case). We only
 * short-circuit to a redirect once the client confirms a live session — a brief
 * landing flash for a signed-in visitor is the accepted trade-off.
 */
export function LandingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authed = useSyncExternalStore(noopSubscribe, isAuthenticated, () => false);
  const onboarded = useSyncExternalStore(subscribeOnboarded, isOnboarded, () => false);

  useEffect(() => {
    if (!authed) return;
    router.replace(onboarded ? "/jobs/" : "/onboarding/");
  }, [authed, onboarded, router]);

  if (authed) return null; // redirecting — don't paint the landing under it
  return <>{children}</>;
}
