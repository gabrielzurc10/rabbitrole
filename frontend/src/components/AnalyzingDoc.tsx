/**
 * The animated resume "sheet" shown while an analysis runs: a white page with
 * skeleton lines shimmering in the brand color (see .analyzing-doc /
 * .skeleton-primary). Sized tall like a real resume — a name header plus several
 * sections. Shared by the /analyzing page and the Resume page's live state.
 */
export function AnalyzingDoc() {
  return (
    <div className="analyzing-doc">
      <div className="skeleton-primary h-5 w-3/5" />
      <div className="skeleton-primary mt-2.5 h-3 w-2/5" />
      {[
        ["w-full", "w-11/12", "w-4/5"],
        ["w-full", "w-5/6", "w-2/3"],
        ["w-full", "w-11/12", "w-3/4"],
        ["w-full", "w-4/5", "w-1/2"],
      ].map((lines, s) => (
        <div key={s} className="mt-5">
          <div className="skeleton-primary h-3 w-1/4" />
          <div className="mt-2.5 space-y-2.5">
            {lines.map((w, i) => (
              <div key={i} className={`skeleton-primary h-2.5 ${w}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
