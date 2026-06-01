import { TagCounts } from "@/types";
import { SEVERITY_META } from "@/lib/severity";

export function ScoreSummary({ counts }: { counts: TagCounts }) {
  const items = [
    { sev: "critical" as const, n: counts.critical },
    { sev: "warning" as const, n: counts.warning },
    { sev: "optional" as const, n: counts.optional },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ sev, n }) => (
        <div key={sev} className="card card-pad text-center">
          <div className={`text-3xl font-bold ${SEVERITY_META[sev].text}`}>
            {n}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {SEVERITY_META[sev].label}
          </div>
        </div>
      ))}
    </div>
  );
}
