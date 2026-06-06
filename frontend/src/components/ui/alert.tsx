import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const DEFAULT_MESSAGE = "An error has occurred. Please try again.";

/**
 * Inline error message: an alert-triangle icon + text in a soft critical-tinted
 * box. Replaces bare red text app-wide. Falls back to a friendly generic message
 * when none is given.
 */
export function ErrorAlert({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("error-alert", className)}>
      <Icon name="alert-triangle" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message || DEFAULT_MESSAGE}</span>
    </div>
  );
}
