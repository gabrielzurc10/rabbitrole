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
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getProfile, peekProfile, saveProfile, deleteAccount, ApiError } from "@/lib/api";
import { logout, getEmail } from "@/lib/auth";
import { titleCase } from "@/lib/text";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { Profile } from "@/types";

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
  // with no refetch or skeleton flash — but only once past the initial hydration.
  const cached = hydrated ? (peekProfile() ?? null) : null;

  const [profile, setProfile] = useState<Profile | null>(cached);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(cached?.fullName ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  // Email comes from the ID token (browser-only), so read it after mount to keep the
  // static-export hydration clean.
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount read
    setEmail(getEmail());
  }, []);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

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
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Could not load your profile."));
  }, [ready, router, profile]);

  if (loadError) {
    return (
      <div className="page min-h-[calc(100vh-7rem)]">
        <div className="mx-auto max-w-md">
          <ErrorAlert message={loadError} />
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="page min-h-[calc(100vh-7rem)]">
        <ProfileSkeleton />
      </div>
    );
  }

  const canSave =
    fullName.trim().length > 0 && titleCase(fullName.trim()) !== profile.fullName;

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      // Spread the existing profile so preferences (roles/cities/etc.) are untouched.
      const updated = await saveProfile({ ...(profile as Profile), fullName: titleCase(fullName.trim()) });
      setProfile(updated);
      setSavedToast(true);
    } catch {
      setSaveError("An error has occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      logout(); // clears tokens + redirects (keeps the spinner up through the redirect)
    } catch {
      setDeleting(false);
      setSaveError("An error has occurred. Please try again.");
      setDeleteOpen(false);
    }
  }

  return (
    <div className="page min-h-[calc(100vh-7rem)]">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">{profile.fullName}</h1>
            <p className="mt-1 text-muted-foreground">Your account settings.</p>
          </div>
          <Button
            variant="outline"
            className="group"
            onClick={() => setSignOutOpen(true)}
          >
            <Icon name="log-out" className="icon-nudge-right h-4 w-4" />
            Sign out
          </Button>
        </div>

        {/* Account */}
        <Card>
          <CardBody className="space-y-5">
            <CardTitle>Account</CardTitle>

            <div>
              <label htmlFor="name" className="label">Full name</label>
              <input
                id="name"
                className="input"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setFullName(titleCase(fullName))}
              />
            </div>

            <div>
              <label className="label">Email</label>
              <p className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <Icon name="mail" className="h-4 w-4 shrink-0 text-foreground" />
                {email ?? "—"}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={save}
                disabled={!canSave || saving}
                className="group hover:opacity-100"
              >
                <Icon name="save" className="icon-nudge-up h-4 w-4" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {saveError && <ErrorAlert message={saveError} />}
            </div>
          </CardBody>
        </Card>

        {/* Appearance */}
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardSubtitle className="mt-1">Choose your theme.</CardSubtitle>
            </div>
            <ThemeToggle />
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
            <Button
              variant="outline"
              className="group text-foreground"
              onClick={() => setDeleteOpen(true)}
            >
              <Icon name="trash" className="icon-nudge-up h-4 w-4" />
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
          <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            // bg-none drops btn-primary's gradient so the critical background shows.
            className="group bg-none bg-critical text-white hover:opacity-100"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Deleting…
              </>
            ) : (
              <>
                <Icon name="trash" className="icon-nudge-up h-4 w-4" />
                Delete everything
              </>
            )}
          </Button>
        </div>
      </Dialog>

      <Dialog open={signOutOpen} onClose={() => setSignOutOpen(false)}>
        <h2 className="text-lg font-semibold">Sign out?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;ll need to sign back in to see your matches and review.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setSignOutOpen(false)}>
            Cancel
          </Button>
          <Button
            // bg-none drops btn-primary's gradient so the critical background shows.
            onClick={() => logout()}
            className="group bg-none bg-critical text-white hover:opacity-100"
          >
            <Icon name="log-out" className="icon-nudge-right h-4 w-4" />
            Sign out
          </Button>
        </div>
      </Dialog>

      <Toast
        open={savedToast}
        message="Changes are saved"
        placement="top-center"
        onClose={() => setSavedToast(false)}
      />
    </div>
  );
}
