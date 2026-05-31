import { Icon } from "@/components/ui/icon";
import { JobCard } from "@/components/JobCard";
import { MOCK_JOBS } from "@/lib/mock";

export default function JobsPage() {
  const jobs = MOCK_JOBS;

  return (
    <div className="page">
      <div className="mx-auto max-w-3xl">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Icon name="briefcase" className="text-primary" />
          Matched jobs
        </h1>
        <p className="mt-1 text-muted-foreground">
          Backend Engineer roles ranked by match with your resume.
        </p>

        <div className="mt-6 space-y-3">
          {jobs.map((job, i) => (
            <div
              key={job.id}
              className="motion-safe:animate-[slide-up_0.4s_ease-out_both]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <JobCard job={job} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
