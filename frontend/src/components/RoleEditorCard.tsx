"use client";

import { useState } from "react";
import { Card, CardBody, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RoleChipInput } from "@/components/RoleChipInput";
import { saveProfile } from "@/lib/api";
import { reanalyzeStored } from "@/lib/analysisStatus";
import type { Profile } from "@/types";

/**
 * Edit the target roles straight from the resume review. Saving persists the new roles
 * immediately; if the primary role (the first one — what the resume is scored against)
 * changed, it also re-analyzes the stored resume in the background, so the review + score
 * update with the analyze animation. Seeded from the profile, so it re-seeds when the
 * parent passes a refreshed profile after a save.
 */
export function RoleEditorCard({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: (saved: Profile) => void;
}) {
  const [roles, setRoles] = useState<string[]>(profile.targetRoles);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Order-sensitive (the first role is primary), so a reorder counts as a change too.
  const dirty = roles.join("|") !== profile.targetRoles.join("|");
  const canSave = roles.length > 0 && dirty && !saving;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const prevPrimary = profile.targetRoles[0];
      const saved = await saveProfile({ ...profile, targetRoles: roles });
      onSaved(saved);
      const newPrimary = saved.targetRoles[0];
      // Primary role drives the score — re-analyze the stored resume in the background
      // (the analyze animation takes over) so the review reflects the new role.
      if (newPrimary && newPrimary !== prevPrimary && saved.resumeId) {
        void reanalyzeStored(saved, newPrimary).catch(() => {});
      }
    } catch {
      setError("Couldn't update your roles. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <CardTitle>Target roles</CardTitle>
        <CardSubtitle>
          Your resume is scored against your primary role. Change it to reanalyze your resume.
        </CardSubtitle>
        <RoleChipInput value={roles} onChange={setRoles} />
        {error && <p className="text-sm text-critical">{error}</p>}
        <Button onClick={save} disabled={!canSave} className="group hover:opacity-100">
          <Icon name="check" className="icon-nudge-up h-4 w-4" />
          {saving ? "Saving…" : "Update roles"}
        </Button>
      </CardBody>
    </Card>
  );
}
