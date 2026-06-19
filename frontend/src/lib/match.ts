// Match-score presentation helpers, shared by the real JobCard (client) and the
// landing showcase demo (server) — kept framework-agnostic so both can call them.

/** Qualitative label for the match ring — derived from our own score, no external data. */
export function matchLabel(pct: number | null): string {
  if (pct == null) return "Not scored";
  if (pct >= 80) return "Great match";
  if (pct >= 60) return "Good match";
  if (pct >= 40) return "Fair match";
  return "Weak match";
}

/**
 * Colour tone for the match score, by tier: green for a good fit, amber mid, red
 * weak, neutral when unscored. `ring` colours the progress arc, `text` the label,
 * and `panel` tints the match panel's background gradient.
 */
export function matchTone(pct: number | null): { ring: string; text: string; panel: string } {
  if (pct == null)
    return { ring: "text-muted-foreground", text: "text-muted-foreground", panel: "" };
  if (pct >= 60)
    return {
      ring: "text-primary",
      text: "text-primary-strong",
      panel: "bg-gradient-to-br from-primary/15 via-accent/10 to-transparent",
    };
  if (pct >= 40)
    return {
      ring: "text-warning",
      text: "text-warning",
      panel: "bg-gradient-to-br from-warning/15 to-transparent",
    };
  return {
    ring: "text-critical",
    text: "text-critical",
    panel: "bg-gradient-to-br from-critical/15 to-transparent",
  };
}
