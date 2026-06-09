"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Fades + slides its children up the first time they scroll into view (then stays shown).
 * Uses an IntersectionObserver — the same pattern as the jobs page's infinite-scroll
 * sentinel. Under reduced motion the hidden state is dropped (motion-safe), so the content
 * is simply visible with no transform.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect(); // reveal once
        }
      },
      // Trigger only once the row is well up into the viewport (not the moment its top
      // edge peeks in), so with the spacing between rows they reveal one at a time.
      { rootMargin: "0px 0px -35% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out",
        "motion-safe:translate-y-6 motion-safe:opacity-0",
        shown && "motion-safe:translate-y-0 motion-safe:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
