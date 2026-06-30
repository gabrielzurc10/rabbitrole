"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ColorIcon } from "@/components/ui/color-icon";
import { ErrorAlert } from "@/components/ui/alert";
import { ResumeUploader } from "@/components/ResumeUploader";
import { RoleChipInput } from "@/components/RoleChipInput";
import { RemoteToggle } from "@/components/RemoteToggle";
import { EmploymentTypeSelector, EMPLOYMENT_LABELS } from "@/components/EmploymentTypeSelector";
import { CityProximityEditor } from "@/components/CityProximityEditor";
import { Stepper } from "@/components/Stepper";
import { AutoHeight } from "@/components/AutoHeight";
import { peekProfile } from "@/lib/api";
import { titleCase } from "@/lib/text";
import {
  getOnboardingDraft,
  loadOnboardingForm,
  saveOnboardingForm,
  setOnboardingDraft,
  takeAnalyzeError,
} from "@/lib/onboardingDraft";
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

  // True once the saved inputs have been read back (or confirmed absent). Gates the
  // persist effect below so the initial empty render can't clobber a saved draft
  // before we've restored it.
  const [hydrated, setHydrated] = useState(false);
  // Set when we restored inputs but couldn't recover the resume file, so the Resume
  // step can prompt the user to re-attach it.
  const [needsReattach, setNeedsReattach] = useState(false);

  // Restore the wizard's inputs after a full reload — chiefly a forced re-login that
  // bounced the user out mid-flow. The File isn't serializable: recover it from the
  // in-flight draft if that survived (a soft nav back from a failed analysis), else
  // drop the user on the Resume step to re-attach it with everything else intact.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot mount restore of
       browser-only state; can't seed via useState without a hydration mismatch */
    const saved = loadOnboardingForm();
    if (saved) {
      setFullName(saved.fullName);
      setRoles(saved.roles);
      setRemote(saved.remote);
      setEmploymentTypes(saved.employmentTypes);
      setCities(saved.cities);
      const draftFile = getOnboardingDraft()?.file ?? null;
      if (draftFile) {
        setFile(draftFile);
        setStep(saved.step);
      } else if (saved.step > 2) {
        setStep(2); // past the resume step but the file is gone — re-attach it
        setNeedsReattach(true);
      } else {
        setStep(saved.step);
      }
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Mirror inputs to sessionStorage as they change so a forced re-login (or any
  // reload) doesn't lose the user's work. Skipped until restore has run.
  useEffect(() => {
    if (!hydrated) return;
    saveOnboardingForm({ step, fullName, roles, remote, employmentTypes, cities });
  }, [hydrated, step, fullName, roles, remote, employmentTypes, cities]);

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

  // Press Enter anywhere (when not typing in a field or on a button) to continue —
  // useful on steps with no text input (Resume) or after clicking away from one.
  // Inputs/buttons keep their own Enter behaviour (add a role/city, click), so we
  // skip those targets here to avoid adding-and-advancing or double-advancing.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(t.tagName))
      ) {
        return; // let the focused control handle its own Enter
      }
      if (step < STEPS.length && stepValid) {
        e.preventDefault();
        setStep((s) => s + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, stepValid]);

  function start() {
    if (!file) return;
    setOnboardingDraft({
      profile: {
        fullName: titleCase(fullName.trim()),
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
      <div className="mx-auto max-w-2xl motion-safe:animate-[slide-up_0.4s_ease-out_both]">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Set up your profile</h1>
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
          <CardBody>
            <AutoHeight>
            {step === 1 && (
              <div>
                <label htmlFor="fullName" className="label">
                  What&apos;s your full name?
                </label>
                <input
                  id="fullName"
                  className="input"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setFullName(titleCase(fullName))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && stepValid) next();
                  }}
                  autoFocus
                />
              </div>
            )}

            {step === 2 && (
              <div>
                <ResumeUploader onFile={setFile} centered fileName={file?.name} />
                {needsReattach && !file && (
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    We saved your details — please re-attach your resume to continue.
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div>
                <label className="label">Which roles are you targeting?</label>
                <p className="mb-3 text-sm text-muted-foreground">
                  Add one or more. The first is your primary role; we score your resume against it.
                </p>
                <RoleChipInput
                  value={roles}
                  onChange={setRoles}
                  onEnterWhenEmpty={() => {
                    if (stepValid) next();
                  }}
                />
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
                  <label className="label">Employment type (optional, pick any)</label>
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
            </AutoHeight>
          </CardBody>
        </Card>

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            className="group text-foreground hover:bg-transparent"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            <Icon name="arrow-left" className="icon-nudge-left h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length ? (
            <Button className="group hover:opacity-100" onClick={next} disabled={!stepValid}>
              Continue
              <Icon name="arrow-right" className="icon-nudge-right h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" className="group hover:opacity-100" onClick={start}>
              <ColorIcon name="sparkles" className="icon-nudge-up h-4 w-4" />
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
      {/* The first role is primary — what the resume is scored against — so call it out. */}
      <ReviewRow label="Primary role" value={roles[0] ?? "—"} />
      {roles.length > 1 && (
        <ReviewRow label="Other roles" value={roles.slice(1).join(", ")} />
      )}
      <ReviewRow label="Work model" value={remote ? "Remote" : "On-site / local"} />
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
