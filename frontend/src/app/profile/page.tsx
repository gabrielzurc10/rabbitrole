"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/dialog";
import { MatchRing } from "@/components/MatchRing";
import { ResumeUploader } from "@/components/ResumeUploader";
import { RoleChipInput } from "@/components/RoleChipInput";
import { WorkModeSelector } from "@/components/WorkModeSelector";
import { CityProximityEditor } from "@/components/CityProximityEditor";
import { getProfile, saveProfile, deleteAccount, ApiError } from "@/lib/api";
import { setOnboardingDraft } from "@/lib/onboardingDraft";
import { logout } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { CityPreference, Profile, WorkMode } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const ready = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Editable copy of the preferences.
  const [fullName, setFullName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [workMode, setWorkMode] = useState<WorkMode | null>(null);
  const [cities, setCities] = useState<CityPreference[]>([]);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!ready) return; // wait until the auth guard confirms a live session
    getProfile()
      .then((p) => {
        if (!p) {
          router.replace("/onboarding");
          return;
        }
        setProfile(p);
        setFullName(p.fullName);
        setRoles(p.targetRoles);
        setWorkMode(p.workMode);
        setCities(p.cities);
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Could not load your profile."));
  }, [ready, router]);

  if (loadError) {
    return (
      <div className="page">
        <p className="text-center text-critical">{loadError}</p>
      </div>
    );
  }
  if (!profile || !workMode) {
    return (
      <div className="page">
        <p className="text-center text-muted-foreground">Loading your profile…</p>
      </div>
    );
  }

  const needsCities = workMode === "in-person" || workMode === "hybrid";
  const citiesValid =
    !needsCities || (cities.length > 0 && cities.every((c) => c.city.trim() && c.state.trim()));
  const canSave = fullName.trim().length > 0 && roles.length > 0 && citiesValid;

  function prefs(): Profile {
    return {
      ...(profile as Profile),
      fullName: fullName.trim(),
      targetRoles: roles,
      workMode: workMode as WorkMode,
      cities: needsCities ? cities : [],
    };
  }

  async function save() {
    setSaving(true);
    setSavedMsg(null);
    try {
      const updated = await saveProfile(prefs());
      setProfile(updated);
      setSavedMsg("Saved");
    } catch (e) {
      setSavedMsg(e instanceof ApiError ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  function reAnalyze(file: File) {
    setOnboardingDraft({ profile: prefs(), file });
    router.push("/analyzing");
  }

  async function confirmDelete() {
    try {
      await deleteAccount();
      logout(); // clears tokens + redirects
    } catch (e) {
      setSavedMsg(e instanceof ApiError ? e.message : "Could not delete account.");
      setDeleteOpen(false);
    }
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profile.fullName}</h1>
          <p className="mt-1 text-muted-foreground">Your profile and resume score.</p>
        </div>

        {/* Score */}
        <Card>
          <CardBody className="flex items-center gap-5">
            <MatchRing percent={profile.score ?? 0} size={104} />
            <div>
              <CardTitle>Resume score</CardTitle>
              <CardSubtitle className="mt-1">
                Graded against your primary role, {profile.targetRoles[0]}.
              </CardSubtitle>
              {profile.analysisId && (
                <Link
                  href={`/resume?id=${profile.analysisId}`}
                  className="btn btn-outline btn-sm mt-3"
                >
                  <Icon name="file-text" className="h-4 w-4" />
                  View full review
                </Link>
              )}
            </div>
          </CardBody>
        </Card>

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

            <div>
              <label className="label">Target roles</label>
              <RoleChipInput value={roles} onChange={setRoles} />
            </div>

            <div>
              <label className="label">Work mode</label>
              <WorkModeSelector value={workMode} onChange={setWorkMode} />
            </div>

            {needsCities && (
              <div>
                <label className="label">Locations</label>
                <CityProximityEditor value={cities} onChange={setCities} />
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={save} disabled={!canSave || saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {savedMsg && <span className="text-sm text-muted-foreground">{savedMsg}</span>}
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
    </div>
  );
}
