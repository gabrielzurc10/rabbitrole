import { Icon } from "@/components/ui/icon";
import { HeroCta } from "@/components/HeroCta";
import { LandingGate } from "@/components/LandingGate";
import { Reveal } from "@/components/Reveal";
import { WaveBackground } from "@/components/WaveBackground";
import { SHOWCASE_DEMOS } from "@/components/ShowcaseDemos";
import { cn } from "@/lib/cn";

const STEPS = [
  {
    title: "Upload your resume",
    body: "Drop in a PDF or Word doc. We extract the text, no manual copy/paste.",
    features: [
      "PDF, DOC, or DOCX up to 5MB",
      "Automatic text extraction, no copy/paste",
      "Pick one or more target roles; your primary role drives the score",
      "Re-upload a new version anytime to re-analyze",
    ],
  },
  {
    title: "Get AI feedback",
    body: "Interactive tags grouped by severity, each with why it matters and a suggested fix.",
    features: [
      "Overall score out of 100, graded against your target role",
      "Issues grouped by severity: urgent, critical, and optional",
      "Tap any tag for why it matters and a suggested replacement",
      "Grounded in live postings for your role, so advice stays relevant",
    ],
  },
  {
    title: "Match live jobs",
    body: "See real openings for your target role, ranked by how well your resume fits.",
    features: [
      "Live openings aggregated from Google for Jobs",
      "A resume match % on every posting, ranked best-fit first",
      "Filter by remote, employment type, and location",
      "Direct apply links and employer logos",
      "“Why this match?” reasoning on demand for any role",
    ],
  },
];

export default function Home() {
  return (
    <LandingGate>
      <WaveBackground />
      <div className="page">
        {/* Hero — centered in the first screen; the showcase sits below the fold. */}
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center pb-20 sm:pb-28">
          <div className="card mx-auto max-w-3xl p-8 text-center motion-safe:animate-[slide-up_0.4s_ease-out_both] sm:p-12">
            <span className="badge badge-glass mb-5">
              <Icon name="sparkles" className="h-3.5 w-3.5 text-primary-strong" />
              AI resume reviewer &amp; job matcher
            </span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Fall down the rabbit<span className="gradient-text">role</span> and
              land the interview
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-foreground/80">
              Upload your resume and pick a role. Get clear, prioritized feedback on
              what to fix, then see the live jobs you genuinely match.
            </p>
            <div className="mt-8 flex justify-center">
              <HeroCta />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto mt-12 max-w-6xl scroll-mt-24 sm:mt-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-strong">
              How it works
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              From resume to interview, in three steps
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-foreground/80">
              No guesswork: rabbitrole grades your resume, tells you exactly what to fix,
              and surfaces the live jobs you actually match.
            </p>
          </Reveal>

          {/* Alternating feature rows, each in its own card, revealing on scroll */}
          <div className="mt-16 space-y-8 sm:mt-24 sm:space-y-10">
            {STEPS.map((step, i) => {
              const imageRight = i % 2 === 0; // even rows: text left / demo right
              const Demo = SHOWCASE_DEMOS[i];
              // The jobs demo (last step) shows wide job cards, so give it the full
              // row width: text on top, demo spanning below.
              const wideDemo = i === STEPS.length - 1;
              return (
                <Reveal key={step.title}>
                  <div
                    className={cn(
                      "card p-6 sm:p-10",
                      !wideDemo && "grid items-center gap-8 sm:grid-cols-2 sm:gap-14",
                    )}
                  >
                    {/* Text */}
                    <div
                      className={cn(
                        wideDemo ? "mb-8 max-w-2xl" : imageRight ? "sm:order-1" : "sm:order-2",
                      )}
                    >
                      <div className="mb-4">
                        <span className="text-sm font-semibold uppercase tracking-wide text-primary-strong">
                          Step 0{i + 1}
                        </span>
                      </div>
                      <h3 className="text-2xl font-semibold tracking-tight">{step.title}</h3>
                      <p className="mt-2 text-pretty text-foreground/80">{step.body}</p>
                      <ul className="mt-5 space-y-2.5">
                        {step.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground/90">
                            <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="text-pretty">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Live animated demo (recreates the product UI) */}
                    <div className={cn(!wideDemo && (imageRight ? "sm:order-2" : "sm:order-1"))}>
                      <Demo />
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Closing call-to-action */}
        <section className="mx-auto mt-28 max-w-4xl sm:mt-36">
          <Reveal>
            <div className="card p-10 text-center sm:p-14">
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready to land your next role?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-pretty text-foreground/80">
                Upload your resume and get prioritized, role-specific feedback, plus the
                jobs you match, in minutes.
              </p>
              <div className="mt-7 flex justify-center">
                <HeroCta />
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </LandingGate>
  );
}
