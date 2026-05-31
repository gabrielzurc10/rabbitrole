"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

export function ResumeUploader({ onFile }: { onFile?: (file: File) => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFile?.(file);
  }

  return (
    <div>
      <label className="label">Resume (PDF or Word)</label>
      <label
        className="dropzone cursor-pointer"
        data-dragging={dragging}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" className="h-8 w-8 text-primary" />
        <div>
          <p className="text-sm font-medium">
            {fileName ?? "Drag & drop or click to upload"}
          </p>
          <p className="card-subtitle mt-1">PDF, DOC, or DOCX up to 5MB</p>
        </div>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
    </div>
  );
}
