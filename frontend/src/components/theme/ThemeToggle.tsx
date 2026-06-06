"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const ORDER = ["system", "light", "dark"] as const;
const ICON: Record<(typeof ORDER)[number], string> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
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

  return (
    <div className="theme-switch" role="group" aria-label="Theme">
      {ORDER.map((mode) => {
        const active = mounted && current === mode;
        return (
          <button
            key={mode}
            type="button"
            className={cn("theme-switch-btn", active && "theme-switch-btn-active")}
            aria-label={LABEL[mode]}
            aria-pressed={active}
            onClick={() => setTheme(mode)}
          >
            <Icon name={ICON[mode]} className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
