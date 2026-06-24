"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTheme } from "next-themes";
import { ColorIcon } from "@/components/ui/color-icon";
import { cn } from "@/lib/cn";

const ORDER = ["system", "light", "dark"] as const;
const ICON: Record<(typeof ORDER)[number], string> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};
// The moon's content is nearly square so it reads larger at the same box; the monitor
// and sun are shorter, so render them a touch bigger to match the moon's visual size.
const SIZE: Record<(typeof ORDER)[number], string> = {
  system: "h-5 w-5",
  light: "h-5 w-5",
  dark: "h-4 w-4",
};
const LABEL: Record<(typeof ORDER)[number], string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

/**
 * Inline segmented theme picker — System / Light / Dark, all visible, one click
 * to switch. Waits to mount before marking the active segment, since the resolved
 * theme is only known on the client (standard next-themes hydration guard).
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const current = (theme ?? "system") as (typeof ORDER)[number];
  const activeIndex = ORDER.indexOf(current);

  // The selection circle swipes from its old segment to the new one. We drive the
  // direction off the click (not an effect), so it only animates on real user switches —
  // never on the SSR/mount theme resolution. The bumped key re-mounts the thumb to
  // replay the one-shot animation; `fromIndex` is the segment it travels from.
  const [swipeKey, setSwipeKey] = useState(0);
  const [fromIndex, setFromIndex] = useState(activeIndex);
  function select(mode: (typeof ORDER)[number]) {
    const next = ORDER.indexOf(mode);
    if (next !== activeIndex) {
      setFromIndex(activeIndex);
      setSwipeKey((k) => k + 1);
    }
    setTheme(mode);
  }

  // Each step is one button (1.75rem) + the gap (0.125rem) = 1.875rem.
  const at = (i: number) => `${i * 1.875}rem`;

  return (
    <div className="theme-switch" role="group" aria-label="Theme">
      {/* The selected-state circle. It swipes between segments (see thumb-swipe) and
          rests at the active segment. Re-keyed per switch so the animation replays;
          swipeKey stays 0 on first paint so it never animates from the SSR default. */}
      <span
        aria-hidden
        key={swipeKey}
        className={cn("theme-switch-thumb", swipeKey > 0 && "theme-thumb-swipe")}
        style={
          {
            transform: `translateX(${at(activeIndex)})`,
            "--from": at(fromIndex),
            "--to": at(activeIndex),
          } as CSSProperties
        }
      />
      {ORDER.map((mode) => {
        const active = mounted && current === mode;
        return (
          <button
            key={mode}
            type="button"
            className="theme-switch-btn group"
            aria-label={LABEL[mode]}
            aria-pressed={active}
            onClick={() => select(mode)}
          >
            <ColorIcon name={ICON[mode]} className={cn("icon-nudge-up", SIZE[mode])} />
          </button>
        );
      })}
    </div>
  );
}
