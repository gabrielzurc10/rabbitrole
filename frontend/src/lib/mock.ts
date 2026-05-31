import type { Analysis, Job } from "@/types";

/** Mock data for Phase 1 (frontend-only). Replaced by the API in later phases. */

export const ROLES = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Data Engineer",
  "DevOps Engineer",
  "Product Designer",
] as const;

export const MOCK_ANALYSIS: Analysis = {
  id: "demo",
  resumeName: "jane_doe_resume.pdf",
  role: "Backend Engineer",
  createdAt: "2026-05-31",
  counts: { critical: 2, warning: 3, optional: 4 },
  tags: [
    {
      id: "t1",
      severity: "critical",
      message: "No quantified impact in experience bullets",
      reason:
        "Recruiters scan for measurable results. Bullets like 'improved performance' without numbers are weak signals and often filtered by reviewers.",
      suggestion:
        "Reduced API p95 latency by 42% (310ms → 180ms) by introducing Redis caching and query batching.",
      location: "Experience › Acme Corp › bullet 2",
    },
    {
      id: "t2",
      severity: "critical",
      message: "Missing core backend keywords for the role",
      reason:
        "Backend Engineer postings for this role frequently mention Kafka, system design, and CI/CD. None appear in your resume, which hurts ATS and screening.",
      suggestion:
        "Add a Skills line: 'Kafka, REST/gRPC, system design, Docker, CI/CD (GitHub Actions)'.",
      location: "Skills",
    },
    {
      id: "t3",
      severity: "warning",
      message: "Summary is generic",
      reason:
        "The summary could describe any candidate. A targeted summary increases relevance for the chosen role.",
      suggestion:
        "Backend engineer with 4 years building high-throughput Java/Spring services on AWS.",
      location: "Summary",
    },
    {
      id: "t4",
      severity: "warning",
      message: "Inconsistent date formatting",
      reason: "Mixed formats (2021 vs Jan 2021) look careless to reviewers.",
      suggestion: "Use one format throughout, e.g. 'Jan 2021 – Present'.",
      location: "Experience",
    },
    {
      id: "t5",
      severity: "warning",
      message: "Skills section is unordered",
      reason: "Grouping skills helps reviewers find relevant tech quickly.",
      suggestion: "Group as Languages / Frameworks / Infrastructure / Tools.",
      location: "Skills",
    },
    {
      id: "t6",
      severity: "optional",
      message: "Add a link to GitHub or portfolio",
      reason: "Links let reviewers verify work and boost credibility.",
      suggestion: "Add github.com/janedoe near your contact info.",
      location: "Header",
    },
    {
      id: "t7",
      severity: "optional",
      message: "Consider a two-column layout",
      reason: "A compact layout fits more signal above the fold.",
      suggestion: "Move Skills/Education to a sidebar column.",
    },
    {
      id: "t8",
      severity: "optional",
      message: "Trim resume to one page",
      reason: "For <8 years experience, one page is the norm.",
      suggestion: "Cut the oldest role's bullets to 1–2 lines.",
    },
    {
      id: "t9",
      severity: "optional",
      message: "Add certifications if any",
      reason: "Relevant certs (e.g. AWS) can differentiate candidates.",
      suggestion: "List 'AWS Certified Developer – Associate' under Education.",
    },
  ],
};

export const MOCK_JOBS: Job[] = [
  {
    id: "j1",
    title: "Senior Backend Engineer",
    company: "Northwind Labs",
    location: "Remote (US)",
    salary: "$150k – $180k",
    url: "#",
    matchPercent: 92,
  },
  {
    id: "j2",
    title: "Backend Engineer, Platform",
    company: "Cobalt Systems",
    location: "Austin, TX",
    salary: "$130k – $160k",
    url: "#",
    matchPercent: 84,
  },
  {
    id: "j3",
    title: "Java/Spring Engineer",
    company: "Meridian Health",
    location: "Remote",
    salary: "$120k – $150k",
    url: "#",
    matchPercent: 76,
  },
  {
    id: "j4",
    title: "Software Engineer II (Backend)",
    company: "Lumen Retail",
    location: "Chicago, IL",
    url: "#",
    matchPercent: 61,
  },
];
