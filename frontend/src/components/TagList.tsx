"use client";

import { useState } from "react";
import { Tag } from "@/types";
import { SEVERITY_META, SEVERITY_ORDER } from "@/lib/severity";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/dialog";

export function TagList({ tags }: { tags: Tag[] }) {
  const [active, setActive] = useState<Tag | null>(null);

  return (
    <>
      <div className="space-y-2">
        {SEVERITY_ORDER.map((sev) => {
          const group = tags.filter((t) => t.severity === sev);
          if (group.length === 0) return null;
          return (
            <div key={sev}>
              <h3 className="mb-2 mt-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${SEVERITY_META[sev].dot}`} />
                {SEVERITY_META[sev].label} ({group.length})
              </h3>
              <div className="space-y-2">
                {group.map((tag, i) => (
                  <button
                    key={`${sev}-${i}`}
                    className="tag-chip"
                    onClick={() => setActive(tag)}
                  >
                    <span className={`tag-dot ${SEVERITY_META[tag.severity].dot}`} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">
                        {tag.message}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {tag.location}
                      </span>
                    </span>
                    <Icon
                      name="arrow-right"
                      className="mt-1 h-4 w-4 text-muted-foreground"
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={active !== null} onClose={() => setActive(null)}>
        {active && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className={`badge ${SEVERITY_META[active.severity].badge}`}>
                {SEVERITY_META[active.severity].label}
              </span>
              <span className="text-xs text-muted-foreground">
                {active.location}
              </span>
            </div>
            <h2 className="mb-3 text-lg font-semibold">{active.message}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 font-medium text-muted-foreground">
                  Why it matters
                </p>
                <p>{active.reason}</p>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground">
                  Suggested fix
                </p>
                <p>{active.suggestion}</p>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
