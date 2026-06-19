"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { isAuthenticated } from "@/lib/auth";
import { isOnboarded, subscribeOnboarded } from "@/lib/session";

const TABS = [
  { href: "/jobs/", label: "Jobs", icon: "briefcase", match: "/jobs" },
  { href: "/resume/", label: "Resume", icon: "file-text", match: "/resume" },
  { href: "/profile/", label: "Profile", icon: "user", match: "/profile" },
];

/**
 * The Jobs/Resume/Profile sections collapsed into a burger menu, shown only on small
 * screens (the desktop navbar keeps the centered tabs). Same onboarded gating as
 * <NavTabs/>; closes on outside click and on navigation.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const onboarded = useSyncExternalStore(
    subscribeOnboarded,
    () => isAuthenticated() && isOnboarded(),
    () => false,
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onSection = TABS.some((t) => pathname.startsWith(t.match));
  if (!onboarded && !onSection) return null;

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost btn-icon"
      >
        <Icon name={open ? "x" : "menu"} className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-lg bg-card p-1 shadow-[0_0_15px_rgba(0,0,0,0.1)] motion-safe:animate-[slide-up_0.15s_ease-out]">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.match);
            return (
              <Link
                key={t.href}
                href={t.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  active ? "bg-primary font-medium text-white hover:bg-primary/90" : "text-foreground hover:bg-muted",
                )}
              >
                <Icon name={t.icon} className="icon-nudge-up h-4 w-4" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
