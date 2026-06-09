"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { titleCase } from "@/lib/text";
import type { CityPreference } from "@/types";

/**
 * Add work locations (city + state) and Enter/"Add" to append each as a removable
 * chip — same pattern as the role input. JSearch scopes by city/metro; no cities
 * means "all locations".
 */
export function CityProximityEditor({
  value,
  onChange,
}: {
  value: CityPreference[];
  onChange: (cities: CityPreference[]) => void;
}) {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  // Cities mid-exit-animation, keyed "city|state"; kept rendered until the leave ends.
  const [leaving, setLeaving] = useState<string[]>([]);
  const keyOf = (c: CityPreference) => `${c.city}|${c.state}`;

  function remove(c: CityPreference) {
    const drop = () => onChange(value.filter((p) => keyOf(p) !== keyOf(c)));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      drop();
      return;
    }
    setLeaving((l) => [...l, keyOf(c)]);
  }

  function add() {
    const c = titleCase(city.trim());
    const s = state.trim().toUpperCase();
    if (!c || !s) return;
    const dup = value.some((p) => p.city.toLowerCase() === c.toLowerCase() && p.state === s);
    if (!dup) onChange([...value, { city: c, state: s }]);
    setCity("");
    setState("");
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="e.g. Austin"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <input
          className="input w-20 shrink-0"
          placeholder="TX"
          maxLength={2}
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
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

      {value.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          All locations — add a city to narrow your search.
        </p>
      ) : (
        <div className="chip-input mt-3">
          {value.map((c) => {
            const isLeaving = leaving.includes(keyOf(c));
            return (
              <div
                key={keyOf(c)}
                className={cn(
                  "chip chip-enter relative transition-transform duration-150 hover:z-10 hover:scale-110 motion-reduce:transform-none",
                  isLeaving && "chip-leave",
                )}
                onAnimationEnd={() => {
                  if (!isLeaving) return;
                  setLeaving((l) => l.filter((k) => k !== keyOf(c)));
                  onChange(value.filter((p) => keyOf(p) !== keyOf(c)));
                }}
              >
                {c.city}, {c.state}
                {/* The x is the only thing that removes the location. */}
                <button
                  type="button"
                  className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => remove(c)}
                  aria-label={`Remove ${c.city}, ${c.state}`}
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
