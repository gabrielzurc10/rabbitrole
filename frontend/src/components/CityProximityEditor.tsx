"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
        <Button type="button" variant="outline" onClick={add}>
          <Icon name="plus" className="h-4 w-4" />
          Add
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          All locations — add a city to narrow your search.
        </p>
      ) : (
        <div className="chip-input mt-3">
          {value.map((c, i) => (
            <span key={`${c.city}-${c.state}-${i}`} className="chip">
              {c.city}, {c.state}
              <button
                type="button"
                className="chip-remove"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${c.city}, ${c.state}`}
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
