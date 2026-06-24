import { cn } from "@/lib/cn";

/**
 * Renders a full-colour raster icon from /public/icons/<name>.png.
 *
 * Unlike {@link Icon} (a monochrome SVG tinted via CSS mask + `currentColor`), these
 * are detailed gradient illustrations, so they're shown as real images and keep their
 * own colours in both themes. Use sparingly for hero/marker icons — the masked `Icon`
 * is still the default for UI glyphs that should follow the theme.
 */
export function ColorIcon({
  name,
  className,
  alt = "",
}: {
  name: string;
  className?: string;
  /** Decorative by default (empty alt); pass a label when the icon conveys meaning. */
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export, no next/image loader
    <img
      src={`/icons/${name}.png`}
      alt={alt}
      className={cn("color-icon inline-block h-5 w-5 shrink-0 object-contain", className)}
    />
  );
}
