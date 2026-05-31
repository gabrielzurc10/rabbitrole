"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_META, SEVERITY_ORDER } from "@/lib/severity";
import type { Tag } from "@/types";

export function TagList({ tags }: { tags: Tag[] }) {
  const [active, setActive] = useState<Tag | null>(null);

  return (
    <>
      <div className="space-y-6">
        {SEVERITY_ORDER.map((sev) => {
          const group = tags.filter((t) => t.severity === sev);
          if (group.length === 0) return null;
          const meta = SEVERITY_META[sev];
          return (
            <section key={sev}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <span className={`tag-dot ${meta.dot}`} />
                {meta.label} ({group.length})
              </h3>
              <div className="space-y-2">
                {group.map((tag) => (
                  <button
                    key={tag.id}
                    className="tag-chip"
                    onClick={() => setActive(tag)}
                  >
                    <span className={`tag-dot ${meta.dot}`} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">
                        {tag.message}
                      </span>
                      {tag.location ? (
                        <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                          {tag.location}
                        </span>
                      ) : null}
                    </span>
                    <Icon
                      name="arrow-right"
                      className="h-4 w-4 text-muted-foreground"
                    />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Dialog
        open={active !== null}
        onOpenChange={(o) => !o && setActive(null)}
        title={active?.message}
        description={active?.location}
      >
        {active ? (
          <div className="space-y-4">
            <Badge variant={SEVERITY_META[active.severity].badge}>
              <Icon
                name={SEVERITY_META[active.severity].icon}
                className="h-3.5 w-3.5"
              />
              {SEVERITY_META[active.severity].label}
            </Badge>
            <div>
              <p className="label">Why this matters</p>
              <p className="text-sm text-muted-foreground">{active.reason}</p>
            </div>
            <div>
              <p className="label">Suggested replacement</p>
              <p className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-sm">
                {active.suggestion}
              </p>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
