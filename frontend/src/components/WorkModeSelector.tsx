"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { WorkMode } from "@/types";

const MODES: { value: WorkMode; label: string; icon: string }[] = [
  { value: "in-person", label: "In-person", icon: "briefcase" },
  { value: "hybrid", label: "Hybrid", icon: "map-pin" },
  { value: "remote", label: "Remote", icon: "monitor" },
];

/** Segmented in-person / hybrid / remote picker. */
export function WorkModeSelector({
  value,
  onChange,
}: {
  value: WorkMode | null;
  onChange: (mode: WorkMode) => void;
}) {
  return (
    <div className="segmented">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn("segment", value === m.value && "segment-active")}
          aria-pressed={value === m.value}
        >
          <Icon name={m.icon} className="h-5 w-5" />
          {m.label}
        </button>
      ))}
    </div>
  );
}
