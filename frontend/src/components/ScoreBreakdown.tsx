import { SubScores } from "@/types";

const DIMENSIONS: { key: keyof SubScores; label: string }[] = [
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "impact", label: "Impact" },
  { key: "clarity", label: "Clarity" },
];

/**
 * Rubric breakdown shown under the overall score: a bar per dimension plus the
 * skills the role expects that are missing from the resume. Renders nothing for
 * analyses saved before the rubric existed (no sub-scores and no gaps).
 */
export function ScoreBreakdown({
  subScores,
  missingSkills,
}: {
  subScores: SubScores | null;
  missingSkills: string[];
}) {
  if (!subScores && missingSkills.length === 0) return null;

  return (
    <div className="card card-pad space-y-5">
      {subScores && (
        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Score breakdown
          </h3>
          {DIMENSIONS.map(({ key, label }) => (
            <div key={key} className="score-row">
              <span className="score-row-label">{label}</span>
              <span className="score-bar-track">
                <span className="score-bar-fill" style={{ width: `${subScores[key]}%` }} />
              </span>
              <span className="score-row-value">{subScores[key]}</span>
            </div>
          ))}
        </div>
      )}

      {missingSkills.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Skills to add
          </h3>
          <div className="flex flex-wrap gap-2">
            {missingSkills.map((skill) => (
              <span key={skill} className="badge badge-warning">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
