import { Icon } from "@/components/ui/icon";
import { HeroCta } from "@/components/HeroCta";
import { LandingGate } from "@/components/LandingGate";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/cn";

const STEPS = [
  {
    icon: "upload",
    title: "Upload your resume",
    body: "Drop in a PDF or Word doc. We extract the text — no manual copy-paste.",
    image: "/showcase/upload-resume.png",
    alt: "Resume score card showing an 85% score graded against a Software Engineer role, with view and download actions.",
  },
  {
    icon: "sparkles",
    title: "Get AI feedback",
    body: "Interactive tags grouped by severity, each with why it matters and a suggested fix.",
    image: "/showcase/ai-feedback.png",
    alt: "Suggested improvements grouped by severity — critical, warning, and optional — each an interactive tag.",
  },
  {
    icon: "briefcase",
    title: "Match live jobs",
    body: "See real openings for your target role, ranked by how well your resume fits.",
    image: "/showcase/match-jobs.png",
    alt: "Matched live job postings, each with a resume match percentage and an apply link.",
  },
];

export default function Home() {
  return (
    <LandingGate>
      <div className="page">
        {/* Hero — centered in the first screen; the showcase sits below the fold. */}
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center pb-20 sm:pb-28">
          <div className="mx-auto max-w-3xl text-center motion-safe:animate-[slide-up_0.4s_ease-out_both]">
            <span className="badge badge-neutral mb-5">
              <Icon name="sparkles" className="h-3.5 w-3.5 text-primary" />
              AI resume reviewer &amp; job matcher
            </span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Fall down the rabbit<span className="gradient-text">role</span> and
              land the interview
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
              Upload your resume and pick a role. Get clear, prioritized feedback on
              what to fix, then see the live jobs you genuinely match.
            </p>
            <div className="mt-8 flex justify-center">
              <HeroCta />
            </div>
          </div>
        </section>

        {/* Showcase: alternating feature rows, each revealing on scroll */}
        <section className="mx-auto mt-20 max-w-5xl space-y-28 sm:mt-28 sm:space-y-40">
          {STEPS.map((step, i) => {
            const imageRight = i % 2 === 0; // even rows: text left / image right
            return (
              <Reveal key={step.title}>
                <div className="grid items-center gap-8 sm:grid-cols-2 sm:gap-12">
                  {/* Text */}
                  <div className={cn(imageRight ? "sm:order-1" : "sm:order-2")}>
                    <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon name={step.icon} className="h-5 w-5" />
                    </span>
                    <h2 className="text-2xl font-semibold tracking-tight">{step.title}</h2>
                    <p className="mt-2 text-pretty text-muted-foreground">{step.body}</p>
                  </div>

                  {/* Screenshot in a soft card frame */}
                  <div
                    className={cn(
                      "overflow-hidden rounded-xl border border-border bg-card shadow-[0_0_15px_rgba(0,0,0,0.1)]",
                      imageRight ? "sm:order-2" : "sm:order-1",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, images unoptimized */}
                    <img src={step.image} alt={step.alt} loading="lazy" className="block h-auto w-full" />
                  </div>
                </div>
              </Reveal>
            );
          })}
        </section>
      </div>
    </LandingGate>
  );
}
