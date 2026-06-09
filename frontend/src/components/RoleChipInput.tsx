"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { titleCase } from "@/lib/text";

// useLayoutEffect warns during the static-export prerender; fall back to useEffect there.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Type a role + "Add" (or Enter) to append it as a removable chip. The first
 * chip is the "primary" role — the one the resume is scored against.
 */
export function RoleChipInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (roles: string[]) => void;
}) {
  const [text, setText] = useState("");
  // Roles mid-exit-animation: kept rendered (with the leave class) until the
  // animation ends, then actually dropped from `value`.
  const [leaving, setLeaving] = useState<string[]>([]);

  // FLIP: when the chips reorder (e.g. one is promoted to primary), slide each from its
  // old position to its new one. Positions are measured *relative to the chip container*,
  // not the viewport — otherwise an ancestor animating its height (the filter card's
  // AutoHeight) shifts the chips and the FLIP mistakes that for movement (a bounce). The
  // inverse is played with the Web Animations API (no inline styles left behind, so the
  // CSS hover-scale keeps working).
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevRects = useRef<Map<string, { left: number; top: number }>>(new Map());
  useIsomorphicLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const origin = containerRef.current?.getBoundingClientRect();
    const newRects = new Map<string, { left: number; top: number }>();
    chipRefs.current.forEach((el, role) => {
      const r = el.getBoundingClientRect();
      newRects.set(role, { left: r.left - (origin?.left ?? 0), top: r.top - (origin?.top ?? 0) });
    });
    if (!reduce) {
      chipRefs.current.forEach((el, role) => {
        const prev = prevRects.current.get(role);
        const next = newRects.get(role);
        if (!prev || !next) return;
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (!dx && !dy) return;
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
          { duration: 450, easing: "cubic-bezier(0.2, 0, 0, 1)" },
        );
      });
    }
    prevRects.current = newRects;
  });

  function add() {
    const role = titleCase(text.trim());
    if (!role || value.includes(role)) {
      setText("");
      return;
    }
    onChange([...value, role]);
    setText("");
  }

  function remove(role: string) {
    // Reduced motion (or no animation support): drop it immediately — there'd be
    // no animationend to wait for.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onChange(value.filter((r) => r !== role));
      return;
    }
    setLeaving((l) => [...l, role]);
  }

  // Clicking a chip promotes it to primary by swapping places with the current primary —
  // only those two tags move; the rest stay put (no shuffle).
  function makePrimary(role: string) {
    const idx = value.indexOf(role);
    if (idx <= 0) return; // already primary (or not found)
    const next = [...value];
    [next[0], next[idx]] = [next[idx], next[0]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="e.g. Backend Engineer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" className="group" onClick={add}>
          <Icon name="plus" className="icon-nudge-up h-4 w-4" />
          Add
        </Button>
      </div>

      {value.length > 0 && (
        <div ref={containerRef} className="chip-input mt-3">
          {value.map((role, i) => {
            const isLeaving = leaving.includes(role);
            return (
              <div
                key={role}
                ref={(el) => {
                  if (el) chipRefs.current.set(role, el);
                  else chipRefs.current.delete(role);
                }}
                className={cn(
                  "chip chip-enter relative transition-transform duration-150 hover:z-10 hover:scale-110 motion-reduce:transform-none",
                  i === 0 && "chip-primary",
                  isLeaving && "chip-leave",
                )}
                onAnimationEnd={() => {
                  // Only the leave animation finishes a removal; ignore the enter one.
                  if (!isLeaving) return;
                  setLeaving((l) => l.filter((r) => r !== role));
                  onChange(value.filter((r) => r !== role));
                }}
              >
                {/* Click the chip body to promote it to primary. */}
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5"
                  onClick={() => makePrimary(role)}
                  aria-label={i === 0 ? `${role} — primary role` : `Make ${role} the primary role`}
                >
                  {i === 0 && <span className="text-[10px] font-semibold uppercase tracking-wide">Primary</span>}
                  {role}
                </button>
                {/* The x is the only thing that removes the role. */}
                <button
                  type="button"
                  className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => remove(role)}
                  aria-label={`Remove ${role}`}
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
