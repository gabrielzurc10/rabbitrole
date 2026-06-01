import { Job } from "@/types";
import { MatchRing } from "@/components/MatchRing";
import { Icon } from "@/components/ui/icon";

export function JobCard({ job }: { job: Job }) {
  return (
    <div className="card card-pad flex items-center gap-4">
      <MatchRing percent={job.matchPercent ?? 0} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{job.title}</h3>
        <p className="text-sm text-muted-foreground">
          {[job.company, job.location].filter(Boolean).join(" · ")}
        </p>
        {job.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {job.description}
          </p>
        )}
      </div>
      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline btn-sm shrink-0"
      >
        View
        <Icon name="arrow-right" className="h-4 w-4" />
      </a>
    </div>
  );
}
