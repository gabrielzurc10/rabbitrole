"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ResumeUploader } from "@/components/ResumeUploader";
import { RoleSelector } from "@/components/RoleSelector";
import { ROLES } from "@/lib/mock";

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>(ROLES[1]);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  function analyze() {
    setAnalyzing(true);
    // Phase 1: mock the analysis call, then route to the results page.
    setTimeout(() => router.push("/resume/demo"), 600);
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
            {file ? (
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
