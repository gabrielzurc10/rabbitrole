"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * A floating "back to top" button that fades in once the user has scrolled past
 * `threshold` pixels and smooth-scrolls to the top on click (snapping instantly when
 * the user prefers reduced motion). Always rendered so it can transition in/out; it
 * just toggles visibility, and is inert (no pointer events) while hidden.
 */
export function ScrollToTopButton({ threshold = 600 }: { threshold?: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > threshold);
    onScroll(); // sync now in case the page loads already scrolled (restored position)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      className={cn("scroll-top", show ? "scroll-top-visible" : "scroll-top-hidden")}
    >
      <Icon name="arrow-up" className="h-5 w-5" />
    </button>
  );
}
