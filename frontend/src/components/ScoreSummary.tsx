import { Icon } from "@/components/ui/icon";
import { SEVERITY_META, SEVERITY_ORDER } from "@/lib/severity";
import type { TagCounts } from "@/types";

export function ScoreSummary({ counts }: { counts: TagCounts }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {SEVERITY_ORDER.map((sev, i) => {
        const meta = SEVERITY_META[sev];
        return (
          <div
            key={sev}
            className="card card-pad motion-safe:animate-[slide-up_0.4s_ease-out_both]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className={`badge badge-${meta.badge}`}>
                <Icon name={meta.icon} className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              <span className="text-3xl font-semibold tabular-nums">
                {counts[sev]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
