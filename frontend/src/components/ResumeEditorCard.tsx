"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorIcon } from "@/components/ui/color-icon";
import { Toast } from "@/components/ui/toast";
import { RoleChipInput } from "@/components/RoleChipInput";
import { ResumeUploader } from "@/components/ResumeUploader";
import { saveProfile } from "@/lib/api";
import { reanalyzeStored } from "@/lib/analysisStatus";
import { setOnboardingDraft } from "@/lib/onboardingDraft";
import type { Profile } from "@/types";

/**
 * Edit the target roles and/or upload a new resume from the review, in one card. Nothing
 * re-analyzes as you type or pick a file — changes are only staged. Clicking "Save & Analyze"
 * commits them:
 *  - a new file runs the full upload → analyze pipeline via /analyzing (which persists the
 *    edited roles alongside the fresh analysis);
 *  - roles-only changes save immediately, and re-analyze the stored resume in the background
 *    (with the analyze animation) when the primary role — what the resume is scored against —
 *    changed.
 * Seeded from the profile, so it re-seeds when the parent passes a refreshed profile.
 */
export function ResumeEditorCard({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: (saved: Profile) => void;
}) {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>(profile.targetRoles);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  // Order-sensitive (the first role is primary), so a reorder counts as a change too.
  const rolesDirty = roles.join("|") !== profile.targetRoles.join("|");
  const dirty = rolesDirty || file !== null;
  const canSave = roles.length > 0 && dirty && !saving;

  // A re-analysis only runs for a new file, or when the primary role (what the resume is
  // scored against) changed and there's a stored resume to re-score. A secondary-role-only
  // edit just saves — so the button says "Save", not "Save & Analyze", in that case.
  const willAnalyze = file !== null || (roles[0] !== profile.targetRoles[0] && !!profile.resumeId);

  async function save() {
    // A new file always needs analyzing — hand off to the /analyzing pipeline, which
    // uploads, analyzes against the (possibly edited) primary role, and persists the
    // profile (roles included). No need to save roles separately first.
    if (file) {
      setOnboardingDraft({ profile: { ...profile, targetRoles: roles }, file, origin: "/resume/" });
      router.replace("/analyzing/");
      return;
    }

    // Roles-only change: persist now, and re-analyze the stored resume only if the
    // primary role changed (that's the one the score is based on).
    setSaving(true);
    setError(null);
    try {
      const prevPrimary = profile.targetRoles[0];
      const saved = await saveProfile({ ...profile, targetRoles: roles });
      onSaved(saved);
      setSavedToast(true);
      const newPrimary = saved.targetRoles[0];
      if (newPrimary && newPrimary !== prevPrimary && saved.resumeId) {
        void reanalyzeStored(saved, newPrimary).catch(() => {});
      }
    } catch {
      setError("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Toast
        open={savedToast}
        message="Changes are saved"
        placement="top-center"
        onClose={() => setSavedToast(false)}
      />
      <Card>
        <CardBody className="space-y-5">
          <div className="space-y-3">
            <div>
              <CardTitle>Target roles</CardTitle>
              <CardSubtitle>Your resume is scored against your primary role.</CardSubtitle>
            </div>
            <RoleChipInput value={roles} onChange={setRoles} />
          </div>

          <div className="space-y-3 border-t border-border pt-5">
            <div>
              <CardTitle>Update your resume</CardTitle>
              <CardSubtitle>Upload a new version to analyze it against your roles.</CardSubtitle>
            </div>
            <ResumeUploader onFile={setFile} fileName={file?.name} />
          </div>

          {error && <p className="text-sm text-critical">{error}</p>}

          <Button onClick={save} disabled={!canSave} className="group hover:opacity-100">
            <ColorIcon name="save" className="icon-nudge-up h-4 w-4" />
            {saving ? "Saving…" : willAnalyze ? "Save & Analyze" : "Save"}
          </Button>
        </CardBody>
      </Card>
    </>
  );
}
