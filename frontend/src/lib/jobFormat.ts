import type { Job } from "@/types";

const SALARY_PERIOD_SUFFIX: Record<string, string> = {
  YEAR: "/yr",
  MONTH: "/mo",
  WEEK: "/wk",
  DAY: "/day",
  HOUR: "/hr",
};

/**
 * A compact pay string from JSearch's structured fields, or null when no salary
 * data is present (it usually isn't). Shows a range, or a one-sided "From / Up to"
 * when only one bound is known, plus a period suffix — e.g. "$90K–$120K/yr". Any
 * formatting failure (e.g. an unexpected currency code) degrades to null.
 */
export function formatSalary(job: Job): string | null {
  const { salaryMin, salaryMax, salaryCurrency, salaryPeriod } = job;
  if (salaryMin == null && salaryMax == null) return null;
  try {
    const currency = salaryCurrency || "USD";
    const money = (n: number) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
        notation: n >= 10000 ? "compact" : "standard",
      }).format(n);
    const suffix = salaryPeriod ? (SALARY_PERIOD_SUFFIX[salaryPeriod.toUpperCase()] ?? "") : "";
    const range =
      salaryMin != null && salaryMax != null
        ? `${money(salaryMin)}–${money(salaryMax)}`
        : salaryMin != null
          ? `From ${money(salaryMin)}`
          : `Up to ${money(salaryMax as number)}`;
    return range + suffix;
  } catch {
    return null;
  }
}

/** A relative "3 days ago"-style phrase from an ISO instant, or null. */
export function formatPosted(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const diff = Date.now() - t;
  if (diff < 0) return null; // future/clock-skewed data — skip rather than show nonsense
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return rtf.format(-Math.max(minutes, 1), "minute");
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(diff / 86400000);
  if (days < 30) return rtf.format(-days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return rtf.format(-months, "month");
  return rtf.format(-Math.floor(days / 365), "year");
}
