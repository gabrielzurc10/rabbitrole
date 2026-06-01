// Single typed fetch wrapper (DRY). All backend access goes through here.
import type { Analysis, Job, ResumeUpload, Severity, Tag } from "@/types";
import { getAccessToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Error carrying the backend's message + HTTP status, for the UI to show. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Attach the Cognito bearer token when signed in (omitted in local demo mode).
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the backend running?");
  }

  if (!res.ok) {
    // Backend errors come back as { status, error, message, timestamp }.
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? `Request failed (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

/** Backend serializes severity as an uppercase enum; the UI uses lowercase. */
function normalizeTag(raw: Tag): Tag {
  return { ...raw, severity: String(raw.severity).toLowerCase() as Severity };
}

function normalizeAnalysis(raw: Analysis): Analysis {
  return { ...raw, tags: raw.tags.map(normalizeTag) };
}

export async function uploadResume(file: File): Promise<ResumeUpload> {
  const form = new FormData();
  form.append("file", file);
  return request<ResumeUpload>("/api/resumes", { method: "POST", body: form });
}

export async function analyzeResume(resumeId: string, role: string): Promise<Analysis> {
  const analysis = await request<Analysis>("/api/analyses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeId, role }),
  });
  return normalizeAnalysis(analysis);
}

export async function getAnalysis(id: string): Promise<Analysis> {
  return normalizeAnalysis(await request<Analysis>(`/api/analyses/${id}`));
}

export async function getJobs(role: string, resumeId?: string): Promise<Job[]> {
  const params = new URLSearchParams({ role });
  if (resumeId) params.set("resumeId", resumeId);
  return request<Job[]>(`/api/jobs?${params.toString()}`);
}
