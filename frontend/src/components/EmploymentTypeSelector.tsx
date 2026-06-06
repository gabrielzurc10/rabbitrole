"use client";

import { cn } from "@/lib/cn";
import type { EmploymentType } from "@/types";

/** Slug → label for the employment types (shared with JobCard's badge). */
export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  "full-time": "Full-time",
  contract: "Contract",
  "part-time": "Part-time",
  internship: "Internship",
};

const OPTIONS = Object.keys(EMPLOYMENT_LABELS) as EmploymentType[];

/** Multi-select employment-type picker. Empty selection means "any type". */
export function EmploymentTypeSelector({
  value,
  onChange,
}: {
  value: EmploymentType[];
  onChange: (types: EmploymentType[]) => void;
}) {
  function toggle(type: EmploymentType) {
    onChange(value.includes(type) ? value.filter((t) => t !== type) : [...value, type]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((type) => {
        const active = value.includes(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => toggle(type)}
            className={cn("segment flex-row px-4 py-2", active && "segment-active")}
            aria-pressed={active}
          >
            {EMPLOYMENT_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
