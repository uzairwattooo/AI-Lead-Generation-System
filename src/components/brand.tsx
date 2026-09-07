import { cn } from "@/lib/utils";

/** CodeNativeX mark: a compact monogram plus the wordmark. */
export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--app-primary)] text-[13px] font-bold tracking-tight text-white"
      >
        CX
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight text-[var(--app-text)]">
          CodeNativeX
        </span>
      ) : null}
      <span className="sr-only">CodeNativeX</span>
    </span>
  );
}
