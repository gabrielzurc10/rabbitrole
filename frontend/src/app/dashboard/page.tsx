"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ResumeUploader } from "@/components/ResumeUploader";
import { RoleSelector } from "@/components/RoleSelector";
import { ROLES } from "@/lib/roles";
import { uploadResume, analyzeResume, ApiError } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>(ROLES[1]);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!file) {
      setError("Upload a resume first.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const uploaded = await uploadResume(file);
      const analysis = await analyzeResume(uploaded.id, role);
      // Pass the role along so the results page can link to matched jobs.
      router.push(
        `/resume?id=${analysis.id}&resumeId=${uploaded.id}&role=${encodeURIComponent(role)}`,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
      setAnalyzing(false);
    }
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          Analyze your resume
        </h1>
        <p className="mt-1 text-muted-foreground">
          Upload a resume and choose the role you&apos;re targeting.
        </p>

        <Card className="mt-6">
          <CardBody className="space-y-6">
            <ResumeUploader onFile={setFile} />
            <RoleSelector value={role} onChange={setRole} />
            <Button
              className="w-full"
              size="lg"
              onClick={analyze}
              disabled={analyzing}
            >
              <Icon name="sparkles" className="h-4 w-4" />
              {analyzing ? "Analyzing…" : "Analyze resume"}
            </Button>
            {error ? (
              <p className="text-center text-sm text-critical">{error}</p>
            ) : file ? (
              <p className="text-center text-xs text-muted-foreground">
                Ready: {file.name}
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardBody>
            <CardTitle>How it works</CardTitle>
            <CardSubtitle className="mt-1">
              We extract your resume text, rate it against the role with AI, and
              surface tagged improvements plus matched jobs.
            </CardSubtitle>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
