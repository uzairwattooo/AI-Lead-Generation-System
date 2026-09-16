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
    <span className={cn("group inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[0.55rem]",
          "bg-brand-gradient",
          "text-[13px] font-bold tracking-tight text-white",
          "shadow-(--shadow-primary) ring-1 ring-inset ring-white/25",
        )}
      >
        {/* A diagonal sheen across the monogram, so the mark catches light. */}
        <span
          className="absolute inset-0 bg-linear-to-tr from-transparent via-white/25 to-transparent"
          aria-hidden
        />
        <span className="relative">CX</span>
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
          Code <span className="text-[var(--app-primary)]">Nativex</span>
        </span>
      ) : null}
      <span className="sr-only">Code Nativex</span>
    </span>
  );
}
