"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { CityPreference } from "@/types";

/** Editable list of work locations (city + state). JSearch scopes by city/metro. */
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
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          All locations — add a city to narrow your search.
        </p>
      )}
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
        onClick={() => onChange([...value, { city: "", state: "" }])}
      >
        <Icon name="plus" className="h-4 w-4" />
        Add city
      </Button>
    </div>
  );
}
