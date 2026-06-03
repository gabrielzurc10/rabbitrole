"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ResumeUploader } from "@/components/ResumeUploader";
import { RoleChipInput } from "@/components/RoleChipInput";
import { WorkModeSelector } from "@/components/WorkModeSelector";
import { CityProximityEditor } from "@/components/CityProximityEditor";
import { Stepper } from "@/components/Stepper";
import { setOnboardingDraft } from "@/lib/onboardingDraft";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { CityPreference, WorkMode } from "@/types";

const STEPS = ["Name", "Resume", "Roles", "Location", "Review"];

export default function OnboardingPage() {
  const router = useRouter();
  useRequireAuth(); // redirect to /login if there's no live session (e.g. via Back)
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [workMode, setWorkMode] = useState<WorkMode | null>(null);
  const [cities, setCities] = useState<CityPreference[]>([]);

  const needsCities = workMode === "in-person" || workMode === "hybrid";
  const citiesValid =
    !needsCities || (cities.length > 0 && cities.every((c) => c.city.trim() && c.state.trim()));

  const stepValid =
    step === 1 ? fullName.trim().length > 0
    : step === 2 ? file !== null
    : step === 3 ? roles.length > 0
    : step === 4 ? workMode !== null && citiesValid
    : true;

  function next() {
    if (step < STEPS.length) setStep(step + 1);
  }

  function start() {
    if (!file || !workMode) return;
    setOnboardingDraft({
      profile: {
        fullName: fullName.trim(),
        targetRoles: roles,
        workMode,
        cities: needsCities ? cities : [],
      },
      file,
    });
    router.push("/analyzing");
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your profile</h1>
        <p className="mt-1 text-muted-foreground">
          A few quick steps so we can tailor your review and job matches.
        </p>

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
                  <WorkModeSelector value={workMode} onChange={setWorkMode} />
                </div>
                {needsCities && (
                  <div>
                    <label className="label">Where? Add cities and how far you&apos;ll commute.</label>
                    <CityProximityEditor value={cities} onChange={setCities} />
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <Review
                fullName={fullName}
                fileName={file?.name ?? ""}
                roles={roles}
                workMode={workMode}
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
  workMode,
  cities,
}: {
  fullName: string;
  fileName: string;
  roles: string[];
  workMode: WorkMode | null;
  cities: CityPreference[];
}) {
  const WORK_LABEL: Record<WorkMode, string> = {
    "in-person": "In-person",
    hybrid: "Hybrid",
    remote: "Remote",
  };
  return (
    <div className="space-y-4">
      <h2 className="card-title">Review</h2>
      <ReviewRow label="Name" value={fullName} />
      <ReviewRow label="Resume" value={fileName} />
      <ReviewRow label="Roles" value={roles.join(", ")} />
      <ReviewRow label="Work mode" value={workMode ? WORK_LABEL[workMode] : ""} />
      {cities.length > 0 && (
        <ReviewRow
          label="Locations"
          value={cities.map((c) => `${c.city}, ${c.state} (≤${c.distanceMiles}mi)`).join(" · ")}
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
