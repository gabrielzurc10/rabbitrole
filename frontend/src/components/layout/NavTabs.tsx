"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { isAuthenticated } from "@/lib/auth";
import { isOnboarded, subscribeOnboarded } from "@/lib/session";
import { isAnalyzing, subscribeAnalysisStatus } from "@/lib/analysisStatus";

/**
 * The Jobs/Resume/Profile tabs. Shown once the user is signed in AND onboarded (the
 * onboarded flag is set by the profile/jobs API calls and broadcast, so the
 * tabs appear/disappear live). They're also shown whenever the user is actually
 * on one of those pages, so the tabs stay visible while those pages load
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
  // A background analysis (started from /analyzing) puts a spinner on the Resume
  // tab so the user can tell it's still working after they navigate away.
  const analyzing = useSyncExternalStore(subscribeAnalysisStatus, isAnalyzing, () => false);
  const onJobs = pathname.startsWith("/jobs");
  const onResume = pathname.startsWith("/resume");
  const onProfile = pathname.startsWith("/profile");

  if (!onboarded && !onJobs && !onResume && !onProfile) return null;
  return (
    <>
      <Link
        href="/jobs/"
        aria-current={onJobs ? "page" : undefined}
        className={cn(
          "btn btn-sm group relative",
          onJobs ? "text-primary font-medium" : "text-foreground",
        )}
      >
        <Icon name="briefcase" className="icon-nudge-up h-4 w-4" />
        <span className="relative">
          Jobs
          {onJobs && (
            <span className="nav-underline motion-safe:animate-[nav-underline_0.22s_ease-out]" aria-hidden="true" />
          )}
        </span>
      </Link>
      <Link
        href="/resume/"
        aria-current={onResume ? "page" : undefined}
        className={cn(
          "btn btn-sm group relative",
          onResume ? "text-primary font-medium" : "text-foreground",
        )}
      >
        {analyzing ? (
          <span className="nav-spinner motion-safe:animate-spin" role="status" aria-label="Analyzing your resume" />
        ) : (
          <Icon name="file-text" className="icon-nudge-up h-4 w-4" />
        )}
        <span className="relative">
          Resume
          {onResume && (
            <span className="nav-underline motion-safe:animate-[nav-underline_0.22s_ease-out]" aria-hidden="true" />
          )}
        </span>
      </Link>
      <Link
        href="/profile/"
        aria-current={onProfile ? "page" : undefined}
        className={cn(
          "btn btn-sm group relative",
          onProfile ? "text-primary font-medium" : "text-foreground",
        )}
      >
        <Icon name="user" className="icon-nudge-up h-4 w-4" />
        <span className="relative">
          Profile
          {onProfile && (
            <span className="nav-underline motion-safe:animate-[nav-underline_0.22s_ease-out]" aria-hidden="true" />
          )}
        </span>
      </Link>
    </>
  );
}
