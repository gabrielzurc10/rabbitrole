import type { Severity } from "@/types";

// Class names are written as literals (not `bg-${sev}`) so Tailwind's scanner
// can see them and generate the utilities.
export const SEVERITY_META: Record<
  Severity,
  { label: string; description: string; dot: string; text: string; badge: string }
> = {
  critical: {
    label: "Urgent",
    description: "Fix before applying",
    dot: "bg-critical",
    text: "text-critical",
    badge: "badge-critical",
  },
  warning: {
    label: "Critical",
    description: "Should improve",
    dot: "bg-warning",
    text: "text-warning",
    badge: "badge-warning",
  },
  optional: {
    label: "Optional",
    description: "Nice to have",
    dot: "bg-optional",
    text: "text-optional",
    badge: "badge-optional",
  },
};

export const SEVERITY_ORDER: Severity[] = ["critical", "warning", "optional"];
