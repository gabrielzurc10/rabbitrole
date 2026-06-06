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

/** Kind of employment. Native to JSearch. Backend enum is FULL_TIME/CONTRACT/PART_TIME/INTERNSHIP. */
export type EmploymentType = "full-time" | "contract" | "part-time" | "internship";

export interface CityPreference {
  city: string;
  state: string;
}

export interface Profile {
  fullName: string;
  targetRoles: string[];
  /** Single native toggle: true = remote-only search (no cities), false = local. */
  remote: boolean;
  employmentTypes: EmploymentType[];
  cities: CityPreference[];
  resumeId?: string;
  analysisId?: string;
  score?: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  /** Free-form location string; fallback when city/state are empty. */
  location: string;
  /** Parsed from JSearch's structured location; may be empty. */
  city: string;
  state: string;
  /** Company logo URL from JSearch; null when absent. */
  employerLogo: string | null;
  /** Native remote flag: "remote" or null (on-site/local). */
  workMode: "remote" | null;
  /** Native employment type from JSearch; null when absent. */
  employmentType: EmploymentType | null;
  description: string;
  url: string;
  /** ISO-8601 UTC instant the posting went up; null when absent. */
  postedAt: string | null;
  /** Source aggregator (e.g. "LinkedIn"); null when absent. */
  publisher: string | null;
  /** Structured pay range from JSearch — often null in the aggregated data. */
  salaryMin: number | null;
  salaryMax: number | null;
  /** JSearch pay period enum: "YEAR" | "MONTH" | "HOUR" | …; null when absent. */
  salaryPeriod: string | null;
  /** ISO currency code (e.g. "USD"); null when absent. */
  salaryCurrency: string | null;
  matchPercent: number | null;
}

/** On-demand "why this match?" explanation for a posting. */
export interface JobReasoning {
  reasoning: string;
}

export interface ResumeUpload {
  id: string;
  filename: string;
  filetype: string;
  textLength: number;
  textPreview: string;
}
