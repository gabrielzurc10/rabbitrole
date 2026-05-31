"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/icon";

const ORDER = ["system", "light", "dark"] as const;
const ICON: Record<string, string> = {
  system: "monitor",
  light: "sun",
  dark: "moon",
};

/** Cycles System → Light → Dark. Waits to mount to avoid hydration mismatch. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Standard next-themes pattern: we only know the resolved theme after mount,
  // so render a stable placeholder on the server/first paint.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const current = (theme ?? "system") as (typeof ORDER)[number];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      aria-label={`Theme: ${current}. Switch to ${next}.`}
      onClick={() => setTheme(next)}
    >
      {mounted ? <Icon name={ICON[current]} /> : <Icon name="monitor" />}
    </button>
  );
}
