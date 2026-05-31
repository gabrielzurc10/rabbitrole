import { cn } from "@/lib/cn";

/**
 * Renders an icon from a standalone file in /public/icons/<name>.svg.
 * Uses a CSS mask so the icon inherits `currentColor` (theme-aware) while the
 * SVG stays a separate, cacheable file — never inlined in JSX.
 */
export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-5 w-5 shrink-0 bg-current", className)}
      style={{
        maskImage: `url(/icons/${name}.svg)`,
        WebkitMaskImage: `url(/icons/${name}.svg)`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}
