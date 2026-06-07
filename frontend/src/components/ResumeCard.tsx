"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/dialog";
import { ErrorAlert } from "@/components/ui/alert";
import { MatchRing } from "@/components/MatchRing";
import { getResume, getResumeBlob, peekResume, ApiError } from "@/lib/api";
import type { ResumeUpload } from "@/types";

/**
 * The profile's resume summary card: the score ring, the uploaded file's name,
 * and actions to view it (PDFs render in an inline modal; other formats open in
 * a new tab), download it, or open the full review. The file is fetched once and
 * cached as an object URL, reused by both view + download and revoked on unmount.
 */
export function ResumeCard({
  resumeId,
  score,
  role,
  analysisId,
}: {
  resumeId?: string;
  score: number;
  role?: string;
  analysisId?: string;
}) {
  // Seed from the cache — the profile page won't render this card until the resume
  // metadata is loaded (it shows the full skeleton until then), so this is populated.
  const [meta, setMeta] = useState<ResumeUpload | null>(
    resumeId ? peekResume(resumeId) ?? null : null,
  );
  const [fileSrc, setFileSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resumeId || meta) return; // nothing to load, or already cached/loaded
    getResume(resumeId)
      .then(setMeta)
      .catch(() => setMeta(null)); // card still works; name just shows generic
  }, [resumeId, meta]);

  // Free the object URL when it's replaced or the card unmounts.
  useEffect(() => {
    return () => {
      if (fileSrc) URL.revokeObjectURL(fileSrc);
    };
  }, [fileSrc]);

  const name = meta?.filename ?? "Resume";
  const isPdf =
    (meta?.filetype ?? "").includes("pdf") || name.toLowerCase().endsWith(".pdf");

  // Fetch the bytes once; hand back the cached object URL afterwards.
  async function fileUrl(): Promise<string> {
    if (fileSrc) return fileSrc;
    const blob = await getResumeBlob(resumeId as string);
    const url = URL.createObjectURL(blob);
    setFileSrc(url);
    return url;
  }

  async function view() {
    setError(null);
    setBusy(true);
    try {
      const url = await fileUrl();
      if (isPdf) setOpen(true);
      else window.open(url, "_blank", "noopener"); // browser handles .docx etc.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open the resume.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setError(null);
    setBusy(true);
    try {
      const url = await fileUrl();
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not download the resume.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-5">
          <MatchRing percent={score} size={104} />
          <div className="min-w-0">
            <CardTitle>Resume score</CardTitle>
            {role && (
              <CardSubtitle className="mt-1">
                Graded against your primary role, {role}.
              </CardSubtitle>
            )}
            {resumeId && (
              <span className="mt-2 flex items-center gap-2 text-sm text-foreground">
                <Icon name="file-text" className="h-4 w-4 shrink-0" />
                <span className="truncate font-medium">{name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {resumeId && (
            <>
              <Button variant="outline" size="sm" onClick={view} disabled={busy}>
                <Icon name="file-text" className="h-4 w-4" />
                View resume
              </Button>
              <Button variant="outline" size="sm" onClick={download} disabled={busy}>
                <Icon name="download" className="h-4 w-4" />
                Download
              </Button>
            </>
          )}
          {analysisId && (
            <Link href={`/resume/?id=${analysisId}`} className="btn btn-outline btn-sm">
              <Icon name="sparkles" className="h-4 w-4" />
              View full review
            </Link>
          )}
        </div>

        {error && <ErrorAlert message={error} />}
      </CardBody>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-3xl" title={name}>
        <h2 className="mb-3 truncate pr-8 text-lg font-semibold">{name}</h2>
        {fileSrc && (
          <iframe
            src={fileSrc}
            title={name}
            className="h-[75vh] w-full rounded-lg border border-border"
          />
        )}
        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={download} disabled={busy}>
            <Icon name="download" className="h-4 w-4" />
            Download
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}
