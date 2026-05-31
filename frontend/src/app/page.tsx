import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Card, CardBody, CardTitle, CardSubtitle } from "@/components/ui/card";

const STEPS = [
  {
    icon: "upload",
    title: "Upload your resume",
    body: "Drop in a PDF or Word doc. We extract the text — no manual copy-paste.",
  },
  {
    icon: "sparkles",
    title: "Get AI feedback",
    body: "Interactive tags grouped by severity, each with why it matters and a suggested fix.",
  },
  {
    icon: "briefcase",
    title: "Match live jobs",
    body: "See real openings for your target role, ranked by how well your resume fits.",
  },
];

export default function Home() {
  return (
    <div className="page">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center motion-safe:animate-[slide-up_0.4s_ease-out_both]">
        <span className="badge badge-neutral mb-5">
          <Icon name="sparkles" className="h-3.5 w-3.5 text-primary" />
          AI resume reviewer &amp; job matcher
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Fall down the rabbit<span className="gradient-text">role</span> and
          land the interview
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
          Upload your resume, pick a target role, and get specific, severity-ranked
          feedback — then see the live jobs you actually match.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn btn-primary btn-lg">
            Analyze my resume
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
          <Link href="/jobs" className="btn btn-outline btn-lg">
            <Icon name="briefcase" className="h-4 w-4" />
            Browse matched jobs
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <Card
            key={step.title}
            className="motion-safe:animate-[slide-up_0.4s_ease-out_both]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <CardBody>
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name={step.icon} className="h-5 w-5" />
              </span>
              <CardTitle>{step.title}</CardTitle>
              <CardSubtitle className="mt-1">{step.body}</CardSubtitle>
            </CardBody>
          </Card>
        ))}
      </section>
    </div>
  );
}
