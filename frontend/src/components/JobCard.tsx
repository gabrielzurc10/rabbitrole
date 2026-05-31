import { Icon } from "@/components/ui/icon";
import { MatchRing } from "@/components/MatchRing";
import type { Job } from "@/types";

export function JobCard({ job }: { job: Job }) {
  return (
    <a
      href={job.url}
      className="card card-pad flex items-center gap-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon name="briefcase" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{job.title}</p>
        <p className="truncate text-sm text-muted-foreground">
          {job.company} · {job.location}
        </p>
        {job.salary ? (
          <p className="mt-0.5 text-sm text-primary">{job.salary}</p>
        ) : null}
      </div>
      <MatchRing percent={job.matchPercent} />
    </a>
  );
}
