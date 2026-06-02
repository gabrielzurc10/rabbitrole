// Single typed fetch wrapper (DRY). All backend access goes through here.
import type {
  Analysis,
  CityPreference,
  Job,
  Profile,
  ResumeUpload,
  Severity,
  Tag,
  WorkMode,
} from "@/types";
import { getAccessToken } from "@/lib/auth";
import { setOnboarded } from "@/lib/session";

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
  // 204 (e.g. account deletion) carries no body.
  if (res.status === 204) return undefined as T;
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

// --- profile + account -----------------------------------------------------

/** Backend WorkMode enum <-> the UI's lowercase form. */
const WORK_MODE_TO_API: Record<WorkMode, string> = {
  "in-person": "IN_PERSON",
  hybrid: "HYBRID",
  remote: "REMOTE",
};
const WORK_MODE_FROM_API: Record<string, WorkMode> = {
  IN_PERSON: "in-person",
  HYBRID: "hybrid",
  REMOTE: "remote",
};

interface ProfileApi extends Omit<Profile, "workMode"> {
  workMode: string;
}

function normalizeProfile(raw: ProfileApi): Profile {
  return { ...raw, workMode: WORK_MODE_FROM_API[raw.workMode] ?? "remote" };
}

/** The signed-in user's profile, or null if they haven't onboarded yet (404). */
export async function getProfile(): Promise<Profile | null> {
  try {
    const profile = normalizeProfile(await request<ProfileApi>("/api/profiles/me"));
    setOnboarded(true);
    return profile;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      setOnboarded(false);
      return null;
    }
    throw e;
  }
}

/** Create or update the signed-in user's profile. */
export async function saveProfile(profile: Profile): Promise<Profile> {
  const cities: CityPreference[] = profile.workMode === "remote" ? [] : profile.cities;
  const body = {
    fullName: profile.fullName,
    targetRoles: profile.targetRoles,
    workMode: WORK_MODE_TO_API[profile.workMode],
    cities,
    resumeId: profile.resumeId,
    analysisId: profile.analysisId,
    score: profile.score,
  };
  const saved = normalizeProfile(
    await request<ProfileApi>("/api/profiles/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  setOnboarded(true); // a saved profile means onboarding is complete
  return saved;
}

/** Jobs matched to the signed-in user's saved preferences + resume. */
export async function getJobsForMe(): Promise<Job[]> {
  try {
    const jobs = await request<Job[]>("/api/jobs/me");
    setOnboarded(true);
    return jobs;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) setOnboarded(false);
    throw e;
  }
}

/** Permanently delete the signed-in user's account and all their data. */
export async function deleteAccount(): Promise<void> {
  await request<void>("/api/account", { method: "DELETE" });
  setOnboarded(false);
}
