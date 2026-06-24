"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ColorIcon } from "@/components/ui/color-icon";
import { cn } from "@/lib/cn";
import { isAuthenticated } from "@/lib/auth";
import { isOnboarded, subscribeOnboarded } from "@/lib/session";
import { isAnalyzing, subscribeAnalysisStatus } from "@/lib/analysisStatus";

// useLayoutEffect warns during the static-export prerender; fall back to useEffect there.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const TABS = [
  { href: "/jobs/", match: "/jobs", icon: "briefcase", label: "Jobs" },
  { href: "/resume/", match: "/resume", icon: "file-text", label: "Resume" },
  { href: "/profile/", match: "/profile", icon: "user", label: "Profile" },
] as const;

/**
 * The Jobs/Resume/Profile tabs. Shown once the user is signed in AND onboarded (the
 * onboarded flag is set by the profile/jobs API calls and broadcast, so the
 * tabs appear/disappear live). They're also shown whenever the user is actually
 * on one of those pages, so the tabs stay visible while those pages load
 * (before the flag resolves). Server snapshot is "hidden" so the static export
 * hydrates cleanly.
 *
 * A primary "thumb" sits behind the active tab and slides between tabs on a switch.
 * The tabs live in the persistent layout, so a navigation just updates `pathname`
 * (no remount) and the thumb animates. It's measured (offset/width) rather than
 * computed, since the tabs are different widths.
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

  const activeIndex = TABS.findIndex((t) => pathname.startsWith(t.match));
  const onAnyTab = activeIndex >= 0;

  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  // Don't animate the thumb into place on first paint — only on later tab switches.
  const [ready, setReady] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const el = activeIndex >= 0 ? tabRefs.current[activeIndex] : null;
    setThumb(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
  }, [activeIndex, onboarded, analyzing]);

  useEffect(() => {
    if (!thumb || ready) return;
    const id = requestAnimationFrame(() => setReady(true)); // arm the slide after first placement
    return () => cancelAnimationFrame(id);
  }, [thumb, ready]);

  if (!onboarded && !onAnyTab) return null;

  return (
    <div className="relative flex items-center gap-2">
      {thumb && (
        <span
          aria-hidden
          className={cn("nav-thumb", ready && "nav-thumb-animate")}
          style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
        />
      )}
      {TABS.map((tab, i) => {
        const active = i === activeIndex;
        return (
          <Link
            key={tab.href}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "btn btn-sm group relative z-10 text-foreground",
              !active && "hover:bg-muted",
            )}
          >
            {tab.href === "/resume/" && analyzing ? (
              <span
                className="nav-spinner motion-safe:animate-spin"
                role="status"
                aria-label="Analyzing your resume"
              />
            ) : (
              <ColorIcon name={tab.icon} className="icon-nudge-up h-4 w-4" />
            )}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
