import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ScoreSummary } from "@/components/ScoreSummary";
import { TagList } from "@/components/TagList";
import { MOCK_ANALYSIS } from "@/lib/mock";

// Static export needs the set of params to pre-render.
export function generateStaticParams() {
  return [{ id: "demo" }];
}

export default function ResumePage() {
  const analysis = MOCK_ANALYSIS;

  return (
    <div className="page">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Icon name="file-text" className="text-primary" />
              {analysis.resumeName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reviewed for{" "}
              <span className="font-medium text-foreground">{analysis.role}</span>{" "}
              · {analysis.createdAt}
            </p>
          </div>
          <Link href="/jobs" className="btn btn-outline btn-sm">
            <Icon name="briefcase" className="h-4 w-4" />
            View matched jobs
          </Link>
        </div>

        <div className="mt-6">
          <ScoreSummary counts={analysis.counts} />
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            Suggested improvements
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Click any tag to see why it matters and a suggested replacement.
          </p>
          <TagList tags={analysis.tags} />
        </div>
      </div>
    </div>
  );
}
