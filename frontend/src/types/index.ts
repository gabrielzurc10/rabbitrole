// Shapes mirror the backend DTOs. Severity is normalized to lowercase in
// `lib/api.ts` so the UI + CSS classes stay lowercase (badge-critical, …).

export type Severity = "critical" | "warning" | "optional";

export interface Tag {
  severity: Severity;
  message: string;
  reason: string;
  suggestion: string;
  location: string;
}

export interface TagCounts {
  critical: number;
  warning: number;
  optional: number;
}

export interface Analysis {
  id: string;
  resumeId: string;
  role: string;
  score: number;
  counts: TagCounts;
  tags: Tag[];
  createdAt: string;
}

/** Where the user wants to work. Backend enum is IN_PERSON/HYBRID/REMOTE. */
export type WorkMode = "in-person" | "hybrid" | "remote";

export interface CityPreference {
  city: string;
  state: string;
  distanceMiles: number;
}

export interface Profile {
  fullName: string;
  targetRoles: string[];
  workMode: WorkMode;
  cities: CityPreference[];
  resumeId?: string;
  analysisId?: string;
  score?: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  matchPercent: number | null;
}

export interface ResumeUpload {
  id: string;
  filename: string;
  filetype: string;
  textLength: number;
  textPreview: string;
}
