"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorIcon } from "@/components/ui/color-icon";
import { Dialog } from "@/components/ui/dialog";
import { ErrorAlert } from "@/components/ui/alert";
import { MatchRing } from "@/components/MatchRing";
import { getResume, getResumeBlob, getResumeFileUrls, peekResume, ApiError } from "@/lib/api";
import type { ResumeUpload } from "@/types";

/**
 * Small/touch screens (phones) don't render PDFs inside an iframe — the inline
 * modal just shows blank — so we open the file in a new tab there instead, where
 * the mobile browser renders it as a full-page navigation.
 */
function prefersNewTab(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

/**
 * The profile's resume summary card: the score ring, the uploaded file's name,
 * and actions to view it (PDFs render in an inline modal on desktop, a new tab on
 * mobile; other formats open in a new tab), download it, or open the full review.
 *
 * The file loads from short-lived presigned S3 URLs (one for inline view, one for
 * download) so it bypasses the Lambda response path, which mangles binary files
 * (a PDF would render as raw text). Local dev has no S3 to presign, so it falls
 * back to fetching the bytes and serving them from an object URL. URLs are fetched
 * once, cached, and any object URL is revoked on unmount.
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
  // Cached view/download URLs (presigned S3, or a local object URL fallback).
  const [urls, setUrls] = useState<{ view: string; download: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resumeId || meta) return; // nothing to load, or already cached/loaded
    getResume(resumeId)
      .then(setMeta)
      .catch(() => setMeta(null)); // card still works; name just shows generic
  }, [resumeId, meta]);

  // Free the object URL (local fallback only) when the card unmounts.
  useEffect(() => {
    return () => {
      if (urls?.view.startsWith("blob:")) URL.revokeObjectURL(urls.view);
    };
  }, [urls]);

  const name = meta?.filename ?? "Resume";
  const isPdf =
    (meta?.filetype ?? "").includes("pdf") || name.toLowerCase().endsWith(".pdf");

  // Resolve the view/download URLs once. Prefer presigned S3 URLs; fall back to an
  // object URL from the bytes when the backend can't presign (local dev).
  async function loadUrls(): Promise<{ view: string; download: string }> {
    if (urls) return urls;
    const presigned = await getResumeFileUrls(resumeId as string);
    let resolved: { view: string; download: string };
    if (presigned.viewUrl) {
      resolved = { view: presigned.viewUrl, download: presigned.downloadUrl ?? presigned.viewUrl };
    } else {
      const blob = await getResumeBlob(resumeId as string);
      // Force the type so the iframe renders the PDF instead of showing raw bytes.
      const typed = isPdf ? new Blob([blob], { type: "application/pdf" }) : blob;
      const objectUrl = URL.createObjectURL(typed);
      resolved = { view: objectUrl, download: objectUrl };
    }
    setUrls(resolved);
    return resolved;
  }

  async function view() {
    setError(null);
    setBusy(true);
    // A non-PDF (.docx) always opens in a new tab; a PDF does too on mobile, where
    // the iframe preview won't render. The tab must be opened now, inside the click
    // gesture, or mobile popup blockers reject it after the await below.
    const newTab = !isPdf || prefersNewTab();
    const pending = newTab ? window.open("", "_blank") : null;
    try {
      const { view: url } = await loadUrls();
      if (!newTab) {
        setOpen(true);
      } else if (pending) {
        pending.opener = null;
        pending.location.replace(url);
      } else {
        window.open(url, "_blank", "noopener"); // popup blocked — best effort
      }
    } catch (e) {
      pending?.close();
      setError(e instanceof ApiError ? e.message : "Could not open the resume.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setError(null);
    setBusy(true);
    try {
      const { download: url } = await loadUrls();
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
                <ColorIcon name="file-text" className="h-4 w-4 shrink-0" />
                <span className="truncate font-medium">{name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {resumeId && (
            <>
              <Button variant="outline" size="sm" className="group" onClick={view} disabled={busy}>
                <ColorIcon name="file-text" className="icon-nudge-up h-4 w-4" />
                View resume
              </Button>
              <Button variant="outline" size="sm" className="group" onClick={download} disabled={busy}>
                <ColorIcon name="download" className="icon-nudge-up h-4 w-4" />
                Download
              </Button>
            </>
          )}
          {analysisId && (
            <Link href={`/resume/?id=${analysisId}`} className="btn btn-outline btn-sm">
              <ColorIcon name="sparkles" className="h-4 w-4" />
              View full review
            </Link>
          )}
        </div>

        {error && <ErrorAlert message={error} />}
      </CardBody>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-3xl" title={name}>
        <h2 className="mb-3 truncate pr-8 text-lg font-semibold">{name}</h2>
        {urls?.view && (
          <iframe
            src={urls.view}
            title={name}
            className="h-[75vh] w-full rounded-lg border border-border"
          />
        )}
        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" className="group" onClick={download} disabled={busy}>
            <ColorIcon name="download" className="icon-nudge-up h-4 w-4" />
            Download
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}
