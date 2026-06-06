"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { isAuthenticated } from "@/lib/auth";
import { isOnboarded, subscribeOnboarded } from "@/lib/session";

/**
 * The Jobs/Profile tabs. Shown once the user is signed in AND onboarded (the
 * onboarded flag is set by the profile/jobs API calls and broadcast, so the
 * tabs appear/disappear live). They're also shown whenever the user is actually
 * on the Jobs/Profile pages, so the tabs stay visible while those pages load
 * (before the flag resolves). Server snapshot is "hidden" so the static export
 * hydrates cleanly.
 */
export function NavTabs() {
  const pathname = usePathname();
  const onboarded = useSyncExternalStore(
    subscribeOnboarded,
    () => isAuthenticated() && isOnboarded(),
    () => false,
  );
  const onJobs = pathname.startsWith("/jobs");
  const onProfile = pathname.startsWith("/profile");

  if (!onboarded && !onJobs && !onProfile) return null;
  return (
    <>
      <Link
        href="/jobs/"
        aria-current={onJobs ? "page" : undefined}
        className={cn(
          "btn btn-ghost btn-sm",
          onJobs ? "bg-muted text-primary font-medium" : "text-muted-foreground",
        )}
      >
        <Icon name="briefcase" className="h-4 w-4" />
        Jobs
      </Link>
      <Link
        href="/profile/"
        aria-current={onProfile ? "page" : undefined}
        className={cn(
          "btn btn-ghost btn-sm",
          onProfile ? "bg-muted text-primary font-medium" : "text-muted-foreground",
        )}
      >
        <Icon name="user" className="h-4 w-4" />
        Profile
      </Link>
      <span className="nav-divider" aria-hidden="true" />
    </>
  );
}
