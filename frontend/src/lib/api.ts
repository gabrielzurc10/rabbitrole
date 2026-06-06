// Single typed fetch wrapper (DRY). All backend access goes through here.
import type {
  Analysis,
  CityPreference,
  EmploymentType,
  Job,
  JobReasoning,
  Profile,
  ResumeUpload,
  Severity,
  Tag,
} from "@/types";
import { getAccessToken } from "@/lib/auth";
import { setOnboarded, PROFILE_CACHE_KEY, JOBS_CACHE_KEY, RESUME_CACHE_KEY } from "@/lib/session";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

let warmed = false;
/**
 * Fire-and-forget ping to the cheap /healthz endpoint so the Lambda container
 * starts spinning up while the user is still reading/typing — turning what would
 * be a cold start on their first real request (sign-in, upload) into a warm one.
 * Safe to call from multiple places: it fires at most once per page load and
 * swallows every error (e.g. the local backend not running in demo mode).
 */
export function warmUp(): void {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  void fetch(`${BASE_URL}/healthz`, { method: "GET", cache: "no-store" }).catch(() => {});
}

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
    throw new ApiError(0, "Something went wrong. Please try again.");
  }

  if (!res.ok) {
    // Backend errors come back as { status, error, message, timestamp }.
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? "Something went wrong. Please try again.");
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

/** Resume metadata (filename/filetype), cached by id so tab switches don't refetch. */
export async function getResume(id: string): Promise<ResumeUpload> {
  const store = resumeStore();
  if (store[id]) return store[id];
  const meta = await request<ResumeUpload>(`/api/resumes/${id}`);
  store[id] = meta;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(RESUME_CACHE_KEY, JSON.stringify(store));
  }
  return meta;
}

/**
 * The original resume file as a Blob, for inline viewing / download. Binary, so
 * it can't go through request() (which parses JSON) — but it carries the same
 * bearer token. The caller turns it into an object URL.
 */
export async function getResumeBlob(id: string): Promise<Blob> {
  const token = getAccessToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/resumes/${id}/file`, { headers });
  } catch {
    throw new ApiError(0, "Something went wrong. Please try again.");
  }
  if (!res.ok) {
    // Surface the backend's own message (e.g. "re-upload it to view") rather than
    // a bare status code.
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? "Could not load the resume file. Please try again.");
  }
  return res.blob();
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

// --- page data cache -------------------------------------------------------
// Keep the Jobs/Profile data across client-side tab switches so they don't
// refetch (and reflash a skeleton) every time you switch. It's plain module
// state: a full page refresh resets it (so you DO refetch on refresh), and the
// writes below invalidate it. `undefined` = not loaded yet; `null` = loaded but
// the user has no profile/jobs (not onboarded).
let profileCache: Profile | null | undefined;
let jobsCache: Job[] | null | undefined;

// The profile is small + serializable, so unlike the jobs cache it's also mirrored
// to sessionStorage (PROFILE_CACHE_KEY). That keeps the just-saved profile across a
// hard navigation/reload within the tab — notably the /analyzing → /profile hop on
// the static-export site — so /profile shows it instead of refetching and (on any
// read miss) bouncing the user back to /onboarding. Cleared on sign-out by session.ts.
function readStoredProfile(): Profile | null | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(PROFILE_CACHE_KEY);
  if (raw === null) return undefined; // nothing cached this tab session
  try {
    return JSON.parse(raw) as Profile | null; // may be the literal null ("no profile")
  } catch {
    return undefined;
  }
}

/** Update both the in-memory and the sessionStorage profile cache together. */
function setProfileCache(value: Profile | null | undefined): void {
  profileCache = value;
  if (typeof window === "undefined") return;
  if (value === undefined) window.sessionStorage.removeItem(PROFILE_CACHE_KEY);
  else window.sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(value));
}

// Jobs cache — same sessionStorage-backed scheme as the profile, so a tab switch
// (even one that reloads the page) shows the saved jobs instead of re-querying.
function readStoredJobs(): Job[] | null | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(JOBS_CACHE_KEY);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as Job[] | null;
  } catch {
    return undefined;
  }
}

function setJobsCache(value: Job[] | null | undefined): void {
  jobsCache = value;
  if (typeof window === "undefined") return;
  if (value === undefined) window.sessionStorage.removeItem(JOBS_CACHE_KEY);
  else window.sessionStorage.setItem(JOBS_CACHE_KEY, JSON.stringify(value));
}

/** Synchronous peek so a page can seed its initial state without a loading flash. */
export function peekProfile(): Profile | null | undefined {
  if (profileCache === undefined) profileCache = readStoredProfile();
  return profileCache;
}
export function peekJobs(): Job[] | null | undefined {
  if (jobsCache === undefined) jobsCache = readStoredJobs();
  return jobsCache;
}

// Resume metadata cache (filename/filetype) keyed by id. A resume id is immutable,
// so this never needs invalidating — a new upload is a new id (cache miss).
let resumeCache: Record<string, ResumeUpload> | undefined;

function resumeStore(): Record<string, ResumeUpload> {
  if (resumeCache !== undefined) return resumeCache;
  if (typeof window === "undefined") return (resumeCache = {});
  const raw = window.sessionStorage.getItem(RESUME_CACHE_KEY);
  try {
    resumeCache = raw ? (JSON.parse(raw) as Record<string, ResumeUpload>) : {};
  } catch {
    resumeCache = {};
  }
  return resumeCache;
}

/** Synchronous peek of cached resume metadata, for seeding without a loading flash. */
export function peekResume(id: string): ResumeUpload | undefined {
  return resumeStore()[id];
}

// --- profile + account -----------------------------------------------------

/** Backend EmploymentType enum <-> the UI's slug form. */
const EMPLOYMENT_TYPE_TO_API: Record<EmploymentType, string> = {
  "full-time": "FULL_TIME",
  contract: "CONTRACT",
  "part-time": "PART_TIME",
  internship: "INTERNSHIP",
};
const EMPLOYMENT_TYPE_FROM_API: Record<string, EmploymentType> = {
  FULL_TIME: "full-time",
  CONTRACT: "contract",
  PART_TIME: "part-time",
  INTERNSHIP: "internship",
};

interface ProfileApi extends Omit<Profile, "employmentTypes"> {
  employmentTypes: string[] | null;
}

function normalizeProfile(raw: ProfileApi): Profile {
  return {
    ...raw,
    employmentTypes: (raw.employmentTypes ?? [])
      .map((t) => EMPLOYMENT_TYPE_FROM_API[t])
      .filter((t): t is EmploymentType => Boolean(t)),
  };
}

/**
 * The signed-in user's profile, or null if they haven't onboarded yet.
 * The backend returns 204 No Content (not a 404) for the "no profile" case so
 * the browser doesn't log it as a console error — request() maps 204 to undefined.
 */
export async function getProfile(): Promise<Profile | null> {
  if (profileCache === undefined) profileCache = readStoredProfile(); // survive a reload
  if (profileCache !== undefined) return profileCache; // cached from this session
  const raw = await request<ProfileApi | undefined>("/api/profiles/me");
  setOnboarded(!!raw);
  const profile = raw ? normalizeProfile(raw) : null;
  setProfileCache(profile);
  return profile;
}

/** Create or update the signed-in user's profile. */
export async function saveProfile(profile: Profile): Promise<Profile> {
  // Remote postings are location-agnostic, so a remote-eligible search ignores cities;
  // a non-remote one keeps whatever was entered.
  const cities: CityPreference[] = profile.remote ? [] : profile.cities;
  const body = {
    fullName: profile.fullName,
    targetRoles: profile.targetRoles,
    remote: profile.remote,
    employmentTypes: profile.employmentTypes.map((t) => EMPLOYMENT_TYPE_TO_API[t]),
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
  setProfileCache(saved); // keep the cache fresh so a tab switch (or the /analyzing → /profile hop) shows the new data
  setJobsCache(undefined); // preferences changed → matched jobs are now stale
  setOnboarded(true); // a saved profile means onboarding is complete
  return saved;
}

/**
 * Jobs matched to the signed-in user's saved preferences + resume, or null if
 * they haven't onboarded yet. The backend answers 204 No Content (not a 404) for
 * the "no profile" case so the browser doesn't log a console error — request()
 * maps 204 to undefined.
 */
export async function getJobsForMe(): Promise<Job[] | null> {
  if (jobsCache === undefined) jobsCache = readStoredJobs(); // survive a reload
  if (jobsCache !== undefined) return jobsCache; // cached from this session
  const jobs = await request<Job[] | undefined>("/api/jobs/me");
  setOnboarded(!!jobs);
  const value = jobs ?? null;
  setJobsCache(value);
  return value;
}

/**
 * On-demand explanation of why a posting matches the user's resume. Lazy: only
 * called when a card is expanded, so the backend's OpenAI call isn't paid for
 * every posting on load. The frontend already holds the job, so it sends the
 * context back; the resume side is resolved server-side from the user's profile.
 */
export async function getJobReasoning(job: Job): Promise<string> {
  const { reasoning } = await request<JobReasoning>("/api/jobs/reasoning", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: job.title,
      company: job.company,
      description: job.description,
      matchPercent: job.matchPercent,
    }),
  });
  return reasoning;
}

/** Permanently delete the signed-in user's account and all their data. */
export async function deleteAccount(): Promise<void> {
  await request<void>("/api/account", { method: "DELETE" });
  setProfileCache(undefined);
  setJobsCache(undefined);
  resumeCache = undefined; // sign-out also clears RESUME_CACHE_KEY via setOnboarded(false)
  setOnboarded(false);
}
