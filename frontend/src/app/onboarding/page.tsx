"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ErrorAlert } from "@/components/ui/alert";
import { ResumeUploader } from "@/components/ResumeUploader";
import { RoleChipInput } from "@/components/RoleChipInput";
import { RemoteToggle } from "@/components/RemoteToggle";
import { EmploymentTypeSelector, EMPLOYMENT_LABELS } from "@/components/EmploymentTypeSelector";
import { CityProximityEditor } from "@/components/CityProximityEditor";
import { Stepper } from "@/components/Stepper";
import { peekProfile } from "@/lib/api";
import { setOnboardingDraft, takeAnalyzeError } from "@/lib/onboardingDraft";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { CityPreference, EmploymentType } from "@/types";

const STEPS = ["Name", "Resume", "Roles", "Preferences", "Review"];

export default function OnboardingPage() {
  const router = useRouter();
  useRequireAuth(); // redirect to /login if there's no live session (e.g. via Back)
  const [step, setStep] = useState(1);

  // If analysis just failed, /analyzing sent us back here with a one-shot message.
  // Read after mount (it's a browser-only value) to keep the static export hydration clean.
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  useEffect(() => {
    const message = takeAnalyzeError();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount read
    if (message) setAnalyzeError(message);
  }, []);

  // The one-time wizard shouldn't be re-enterable once completed: a returning user
  // (profile already cached) who lands here via Back is sent to their profile.
  useEffect(() => {
    const guard = () => {
      if (peekProfile()) router.replace("/profile/");
    };
    guard();
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) guard();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [router]);

  const [fullName, setFullName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [remote, setRemote] = useState<boolean>(false);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [cities, setCities] = useState<CityPreference[]>([]);

  // Remote postings are location-agnostic, so cities only apply for a non-remote search.
  // No cities = "all locations" (allowed); any city that IS added must be filled in.
  const needsCities = !remote;
  const citiesValid = !needsCities || cities.every((c) => c.city.trim() && c.state.trim());

  const stepValid =
    step === 1 ? fullName.trim().length > 0
    : step === 2 ? file !== null
    : step === 3 ? roles.length > 0
    : step === 4 ? citiesValid
    : true;

  function next() {
    if (step < STEPS.length) setStep(step + 1);
  }

  function start() {
    if (!file) return;
    setOnboardingDraft({
      profile: {
        fullName: fullName.trim(),
        targetRoles: roles,
        remote,
        employmentTypes,
        cities: needsCities ? cities : [],
      },
      file,
      origin: "/onboarding/",
    });
    router.replace("/analyzing/");
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your profile</h1>
        <p className="mt-1 text-muted-foreground">
          A few quick steps so we can tailor your review and job matches.
        </p>

        {analyzeError && (
          <div className="mt-4">
            <ErrorAlert message={analyzeError} />
          </div>
        )}

        <div className="mt-6">
          <Stepper steps={STEPS} current={step} />
        </div>

        <Card className="mt-6">
          <CardBody className="space-y-5">
            {step === 1 && (
              <div>
                <label htmlFor="fullName" className="label">
                  What&apos;s your full name?
                </label>
                <input
                  id="fullName"
                  className="input"
                  placeholder="Ada Lovelace"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {step === 2 && (
              <div>
                <ResumeUploader onFile={setFile} />
                {file && (
                  <p className="mt-2 text-xs text-muted-foreground">Selected: {file.name}</p>
                )}
              </div>
            )}

            {step === 3 && (
              <div>
                <label className="label">Which roles are you targeting?</label>
                <p className="mb-3 text-sm text-muted-foreground">
                  Add one or more. The first is your primary role — we score your resume against it.
                </p>
                <RoleChipInput value={roles} onChange={setRoles} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <label className="label">How do you want to work?</label>
                  <RemoteToggle value={remote} onChange={setRemote} />
                </div>
                {needsCities && (
                  <div>
                    <label className="label">Where do you want to work? Add cities.</label>
                    <CityProximityEditor value={cities} onChange={setCities} />
                  </div>
                )}
                <div>
                  <label className="label">Employment type (optional — pick any)</label>
                  <EmploymentTypeSelector value={employmentTypes} onChange={setEmploymentTypes} />
                </div>
              </div>
            )}

            {step === 5 && (
              <Review
                fullName={fullName}
                fileName={file?.name ?? ""}
                roles={roles}
                remote={remote}
                employmentTypes={employmentTypes}
                cities={needsCities ? cities : []}
              />
            )}
          </CardBody>
        </Card>

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={next} disabled={!stepValid}>
              Continue
              <Icon name="arrow-right" className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={start}>
              <Icon name="sparkles" className="h-4 w-4" />
              Start analysis
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Review({
  fullName,
  fileName,
  roles,
  remote,
  employmentTypes,
  cities,
}: {
  fullName: string;
  fileName: string;
  roles: string[];
  remote: boolean;
  employmentTypes: EmploymentType[];
  cities: CityPreference[];
}) {
  return (
    <div className="space-y-4">
      <h2 className="card-title">Review</h2>
      <ReviewRow label="Name" value={fullName} />
      <ReviewRow label="Resume" value={fileName} />
      <ReviewRow label="Roles" value={roles.join(", ")} />
      <ReviewRow label="Work mode" value={remote ? "Remote eligible" : "On-site / local"} />
      {employmentTypes.length > 0 && (
        <ReviewRow
          label="Employment"
          value={employmentTypes.map((t) => EMPLOYMENT_LABELS[t]).join(", ")}
        />
      )}
      {cities.length > 0 && (
        <ReviewRow
          label="Locations"
          value={cities.map((c) => `${c.city}, ${c.state}`).join(" · ")}
        />
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-border pb-2 text-sm last:border-0">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
