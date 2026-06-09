/**
 * Ambient, slowly drifting wave background for the landing page — three masked
 * gradient ribbons in the app's emerald→teal palette at low opacity, so it reads as
 * subtle motion behind the content (PSP XMB-style) rather than competing with it.
 * Decorative only (aria-hidden), and fixed + pointer-events-none so it never affects
 * layout/input. It intentionally keeps animating even under prefers-reduced-motion —
 * the global reduce-motion rule carves out `.wave` (see globals.css).
 */
export function WaveBackground() {
  return (
    <div aria-hidden className="wave-bg">
      <span className="wave wave-1" />
      <span className="wave wave-2" />
    </div>
  );
}
