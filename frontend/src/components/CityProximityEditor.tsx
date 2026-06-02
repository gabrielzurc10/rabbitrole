"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { CityPreference } from "@/types";

const DISTANCES = [10, 25, 50, 100];

/** Editable list of cities (city + state) each with a commute radius. */
export function CityProximityEditor({
  value,
  onChange,
}: {
  value: CityPreference[];
  onChange: (cities: CityPreference[]) => void;
}) {
  function update(index: number, patch: Partial<CityPreference>) {
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="city-row">
          <div className="min-w-[8rem] flex-1">
            <label className="label">City</label>
            <input
              className="input"
              placeholder="Austin"
              value={c.city}
              onChange={(e) => update(i, { city: e.target.value })}
            />
          </div>
          <div className="w-20">
            <label className="label">State</label>
            <input
              className="input"
              placeholder="TX"
              maxLength={2}
              value={c.state}
              onChange={(e) => update(i, { state: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="w-32">
            <label className="label">Within</label>
            <select
              className="select"
              value={c.distanceMiles}
              onChange={(e) => update(i, { distanceMiles: Number(e.target.value) })}
            >
              {DISTANCES.map((d) => (
                <option key={d} value={d}>
                  {d} miles
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            aria-label="Remove city"
          >
            <Icon name="trash" className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, { city: "", state: "", distanceMiles: 25 }])}
      >
        <Icon name="plus" className="h-4 w-4" />
        Add city
      </Button>
    </div>
  );
}
