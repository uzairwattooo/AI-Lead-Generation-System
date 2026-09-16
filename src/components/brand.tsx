import { cn } from "@/lib/utils";

/** Code Nativex mark: a compact monogram plus the wordmark. */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--app-primary-fill)] text-[12px] font-bold tracking-tight text-white"
      >
        CN
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
          Code Nativex
        </span>
      ) : null}
      <span className="sr-only">Code Nativex</span>
    </span>
  );
}
