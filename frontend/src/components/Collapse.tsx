"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Expand/collapse wrapper that animates its height via the CSS grid-rows trick
 * (`0fr` → `1fr`), so the content's height never has to be measured. It stays mounted
 * through the collapse so the close animates too, then unmounts on transitionend.
 *
 * Put any vertical spacing (margins) on the children, not this wrapper, so it collapses
 * away with the content instead of leaving a gap. Reduced motion is handled by the
 * global `prefers-reduced-motion` cap, which still fires transitionend (→ unmount).
 */
export function Collapse({
  open,
  children,
  className,
  bleedShadow = true,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  // When the children cast a drop shadow, allow it to bleed past the clip box while
  // animating. Turn off for plain (shadow-less) content so it clips tight with no peek.
  bleedShadow?: boolean;
}) {
  const [render, setRender] = useState(open);
  const [expanded, setExpanded] = useState(open);
  // Overflow is clipped while animating (so the grid-rows collapse hides content), but
  // visible once fully open — otherwise it clips the children's drop shadow.
  const [settled, setSettled] = useState(open);

  // Opening mounts at 0fr; closing animates back to 0fr (then unmounts on transitionend).
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to the open prop
      setRender(true);
    } else {
      setExpanded(false);
      setSettled(false); // clip again while collapsing
    }
  }, [open]);

  // Flip to 1fr only once the 0fr mount has committed + painted (this effect runs after
  // that, keyed on `render`), so the grid-rows transition has a starting value to run
  // from. Doing it in the same pass as the mount skips the animation.
  useEffect(() => {
    if (!open || !render || expanded) return;
    const id = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(id);
  }, [open, render, expanded]);

  if (!render) return null;

  return (
    <div
      className={cn("grid transition-[grid-template-rows] duration-300 ease-out", className)}
      style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      onTransitionEnd={(e) => {
        if (e.propertyName !== "grid-template-rows") return;
        if (open) setSettled(true); // fully open — stop clipping so the shadow shows
        else setRender(false);
      }}
    >
      {/* While animating we must clip the content (for the grid-rows collapse), but
          `overflow: clip` + a clip-margin lets the children's drop shadow bleed past the
          clip box so it isn't sheared off. Once fully open we drop clipping entirely. */}
      <div
        className={cn(
          "min-h-0",
          settled
            ? "overflow-visible"
            : bleedShadow
              ? "overflow-clip [overflow-clip-margin:1rem]"
              : "overflow-hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
