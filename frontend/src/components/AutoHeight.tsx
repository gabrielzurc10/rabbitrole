"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Smoothly animates its height as the children change — used so the onboarding card
 * grows/shrinks between steps instead of snapping. Measures the content with a
 * ResizeObserver and transitions an explicit height. Overflow is only clipped while a
 * size change is in flight, so focus rings aren't cut off the rest of the time. Starts
 * at "auto" (and stays there under reduced-motion) so the natural height is used with
 * no jump.
 */
export function AutoHeight({ children, className }: { children: ReactNode; className?: string }) {
  const inner = useRef<HTMLDivElement>(null);
  const prev = useRef<number | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const [clip, setClip] = useState(false);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      const h = el.offsetHeight;
      // Only animate (and clip) once we have a prior height to grow/shrink from.
      if (!reduce && prev.current !== null && prev.current !== h) setClip(true);
      prev.current = h;
      setHeight(reduce ? "auto" : h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "transition-[height] duration-300 ease-out motion-reduce:transition-none",
        clip ? "overflow-hidden" : "overflow-visible",
        className,
      )}
      style={{ height }}
      onTransitionEnd={() => setClip(false)}
    >
      <div ref={inner}>{children}</div>
    </div>
  );
}
