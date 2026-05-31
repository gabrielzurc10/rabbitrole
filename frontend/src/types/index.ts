/** Shared domain types — mirror the backend DTOs. */

export type Severity = "critical" | "warning" | "optional";

export interface Tag {
  id: string;
  severity: Severity;
  message: string;
  reason: string;
  suggestion: string;
  location?: string;
}

export interface TagCounts {
  critical: number;
  warning: number;
  optional: number;
}

export interface Analysis {
  id: string;
  resumeName: string;
  role: string;
  counts: TagCounts;
  tags: Tag[];
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  matchPercent: number;
}
