import type { Severity } from "@/types";

/** Presentation metadata for each severity (DRY across chips, badges, dialogs). */
export const SEVERITY_META: Record<
  Severity,
  {
    label: string;
    icon: string;
    badge: "critical" | "warning" | "optional";
    dot: string;
  }
> = {
  critical: { label: "Critical", icon: "alert-triangle", badge: "critical", dot: "bg-critical" },
  warning: { label: "Warning", icon: "info", badge: "warning", dot: "bg-warning" },
  optional: { label: "Optional", icon: "sparkles", badge: "optional", dot: "bg-optional" },
};

export const SEVERITY_ORDER: Severity[] = ["critical", "warning", "optional"];
