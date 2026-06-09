"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * A plain upload button with the hint/filename below it. `centered` centers the stack
 * (used in onboarding); the default left-aligns it. `fileName` seeds the displayed name
 * so a remount (e.g. stepping back to the upload step in onboarding) still shows the file
 * the parent already holds.
 */
export function ResumeUploader({
  onFile,
  centered = false,
  fileName: initialFileName,
}: {
  onFile?: (file: File) => void;
  centered?: boolean;
  fileName?: string;
}) {
  const [fileName, setFileName] = useState<string | null>(initialFileName ?? null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFile?.(file);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        centered ? "items-center text-center" : "items-start",
      )}
    >
      {/* The file input is hidden inside the label. */}
      <label className="btn btn-outline btn-md group cursor-pointer">
        <Icon
          name="upload"
          className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-y-1 motion-reduce:transform-none"
        />
        {fileName ? "Choose another file" : "Upload resume"}
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      <span className="text-sm text-muted-foreground">
        {fileName ?? "PDF, DOC, or DOCX up to 5MB"}
      </span>
    </div>
  );
}
