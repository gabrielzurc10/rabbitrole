"use client";

import { useEffect, useState } from "react";

/**
 * Reactively tracks a CSS media query. Returns `false` on the server and the very
 * first client render (so static HTML and hydration agree), then syncs to the real
 * match after mount and on every change. Use it to gate JS-driven behaviour that
 * must differ by viewport — e.g. only mounting a mobile sheet below the `lg`
 * breakpoint so Radix's scroll-lock never fires on desktop.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync(); // catch the real value now (initial state is the SSR-safe `false`)
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
