"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/dialog";
import { ErrorAlert } from "@/components/ui/alert";
import { Toast } from "@/components/ui/toast";
import { ProfileSkeleton } from "@/components/Skeleton";
import { ResumeCard } from "@/components/ResumeCard";
import { ResumeUploader } from "@/components/ResumeUploader";
import { PreferenceFields } from "@/components/PreferenceFields";
import { getProfile, peekProfile, getResume, peekResume, saveProfile, deleteAccount, ApiError } from "@/lib/api";
import { setOnboardingDraft, takeAnalyzeError } from "@/lib/onboardingDraft";
import { logout } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { CityPreference, EmploymentType, Profile } from "@/types";

// Flips true after this tab's first mount. Module-scoped (survives remounts) so a
// client-side tab switch can seed from the cache instantly, while the very first
// render after a full page load still matches the server-prerendered skeleton —
// reading sessionStorage during that initial render would diverge from the static
// HTML and trip a hydration mismatch (React #418).
let hydrated = false;

export default function ProfilePage() {
  const router = useRouter();
  const ready = useRequireAuth();
  // Seed from the cache so switching back to this tab shows the profile instantly,
  // with no refetch or skeleton flash — but only once past the initial hydration
  // (see `hydrated` above); a full refresh starts from the skeleton. On a full
  // reload getProfile() still returns the cache (no network), so no /onboarding bounce.
  const cached = hydrated ? (peekProfile() ?? null) : null;

  const [profile, setProfile] = useState<Profile | null>(cached);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Editable copy of the preferences.
  const [fullName, setFullName] = useState(cached?.fullName ?? "");
  const [roles, setRoles] = useState<string[]>(cached?.targetRoles ?? []);
  const [remote, setRemote] = useState<boolean>(cached?.remote ?? false);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>(
    cached?.employmentTypes ?? [],
  );
  const [cities, setCities] = useState<CityPreference[]>(cached?.cities ?? []);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  // If a re-analyze just failed, /analyzing sent us back here with a one-shot message.
  // Read after mount (it's a browser-only value) to keep the static export hydration clean.
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  useEffect(() => {
    const message = takeAnalyzeError();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount read
    if (message) setAnalyzeError(message);
  }, []);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    hydrated = true;
    if (!ready) return; // wait until the auth guard confirms a live session
    if (profile) return; // already cached from a previous visit — don't refetch
    getProfile()
      .then((p) => {
        if (!p) {
          router.replace("/onboarding/");
          return;
        }
        setProfile(p);
        setFullName(p.fullName);
        setRoles(p.targetRoles);
        setRemote(p.remote);
        setEmploymentTypes(p.employmentTypes);
        setCities(p.cities);
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Could not load your profile."));
  }, [ready, router, profile]);

  // Hold the full skeleton until the resume metadata is loaded too, so the resume
  // card never flashes a half-loaded state (it's seeded from this same cache).
  const resumeId = profile?.resumeId;
  const resumeCached = !resumeId || peekResume(resumeId) != null;
  const [resumeFetched, setResumeFetched] = useState(false);
  useEffect(() => {
    if (!resumeId || peekResume(resumeId)) return; // nothing to fetch
    getResume(resumeId)
      .catch(() => {}) // a miss isn't fatal — the card handles it
      .finally(() => setResumeFetched(true));
  }, [resumeId]);

  if (loadError) {
    return (
      <div className="page">
        <div className="mx-auto max-w-md">
          <ErrorAlert message={loadError} />
        </div>
      </div>
    );
  }
  if (!profile || !(resumeCached || resumeFetched)) {
    return (
      <div className="page">
        <ProfileSkeleton />
      </div>
    );
  }

  // Remote postings are location-agnostic, so cities only apply (and are validated)
  // for a non-remote search. No cities = "all locations"; any city added must be filled.
  const needsCities = !remote;
  const citiesValid = !needsCities || cities.every((c) => c.city.trim() && c.state.trim());
  const valid = fullName.trim().length > 0 && roles.length > 0 && citiesValid;

  // Enable Save only when the editable fields actually differ from what's saved.
  // Type order doesn't matter (sorted); roles + cities are order-sensitive.
  const signature = (p: {
    fullName: string;
    targetRoles: string[];
    remote: boolean;
    employmentTypes: EmploymentType[];
    cities: CityPreference[];
  }) =>
    JSON.stringify([
      p.fullName,
      p.targetRoles,
      p.remote,
      [...p.employmentTypes].sort(),
      p.cities,
    ]);
  const dirty =
    signature({
      fullName: fullName.trim(),
      targetRoles: roles,
      remote,
      employmentTypes,
      cities: needsCities ? cities : [],
    }) !== signature(profile);
  const canSave = valid && dirty;

  function prefs(): Profile {
    return {
      ...(profile as Profile),
      fullName: fullName.trim(),
      targetRoles: roles,
      remote,
      employmentTypes,
      cities: needsCities ? cities : [],
    };
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await saveProfile(prefs());
      setProfile(updated);
      setSavedToast(true);
    } catch {
      setSaveError("An error has occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function reAnalyze(file: File) {
    setOnboardingDraft({ profile: prefs(), file, origin: "/profile/" });
    router.replace("/analyzing/");
  }

  async function confirmDelete() {
    try {
      await deleteAccount();
      logout(); // clears tokens + redirects
    } catch {
      setSaveError("An error has occurred. Please try again.");
      setDeleteOpen(false);
    }
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">{profile.fullName}</h1>
          <p className="mt-1 text-muted-foreground">Your profile and resume score.</p>
        </div>

        {analyzeError && <ErrorAlert message={analyzeError} />}

        {/* Resume score + file (view / download / full review) */}
        <ResumeCard
          resumeId={profile.resumeId}
          score={profile.score ?? 0}
          role={profile.targetRoles[0]}
          analysisId={profile.analysisId}
        />

        {/* Re-analyze */}
        <Card>
          <CardBody className="space-y-3">
            <CardTitle>Update your resume</CardTitle>
            <CardSubtitle>Upload a new version to re-score it.</CardSubtitle>
            <ResumeUploader onFile={reAnalyze} />
          </CardBody>
        </Card>

        {/* Editable preferences */}
        <Card>
          <CardBody className="space-y-5">
            <CardTitle>Preferences</CardTitle>

            <div>
              <label htmlFor="name" className="label">Full name</label>
              <input
                id="name"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <PreferenceFields
              roles={roles}
              onRolesChange={setRoles}
              remote={remote}
              onRemoteChange={setRemote}
              cities={cities}
              onCitiesChange={setCities}
              employmentTypes={employmentTypes}
              onEmploymentTypesChange={setEmploymentTypes}
            />

            <div className="space-y-3">
              <Button onClick={save} disabled={!canSave || saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {saveError && <ErrorAlert message={saveError} />}
            </div>
          </CardBody>
        </Card>

        {/* Danger zone */}
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Delete account</CardTitle>
              <CardSubtitle className="mt-1">
                Permanently removes your profile, resume, and analyses.
              </CardSubtitle>
            </div>
            <Button variant="outline" className="text-critical" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" className="h-4 w-4" />
              Delete account
            </Button>
          </CardBody>
        </Card>
      </div>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <h2 className="text-lg font-semibold">Delete your account?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This permanently deletes your profile, resume, and all analyses. This can&apos;t be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-critical text-white hover:opacity-90" onClick={confirmDelete}>
            Delete everything
          </Button>
        </div>
      </Dialog>

      <Toast open={savedToast} message="Saved" onClose={() => setSavedToast(false)} />
    </div>
  );
}
