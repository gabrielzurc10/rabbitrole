import { Fragment } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** Horizontal progress indicator. `current` is 1-based. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="stepper" aria-label={`Step ${current} of ${steps.length}`}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <Fragment key={label}>
            {i > 0 && (
              <span className="stepper-connector">
                <span
                  className={cn("stepper-connector-fill", n <= current && "stepper-connector-fill-done")}
                />
              </span>
            )}
            <span
              className={cn(
                "stepper-dot",
                done && "stepper-dot-done",
                active && "stepper-dot-active",
                !done && !active && "stepper-dot-todo",
              )}
              title={label}
            >
              {done ? <Icon name="check" className="h-4 w-4" /> : n}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
