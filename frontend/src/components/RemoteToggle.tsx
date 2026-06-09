"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * Single native work-mode toggle for "remote eligible". On = restrict the search to
 * remote-eligible (work-from-home) postings; off = all postings, which still includes
 * the remote-eligible ones. The upstream flag is Google-for-Jobs' TELECOMMUTE signal
 * — it marks a job as offered remotely, not strictly remote-only — hence "eligible".
 */
export function RemoteToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (remote: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn("segment flex-row px-4 py-2", value && "segment-active")}
    >
      <Icon name="monitor" className="h-5 w-5" />
      Remote
    </button>
  );
}
