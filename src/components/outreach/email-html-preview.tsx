interface EmailHtmlPreviewProps {
  html: string | null | undefined;
  plainText: string;
  title: string;
  compact?: boolean;
}

export function EmailHtmlPreview({ html, plainText, title, compact = false }: EmailHtmlPreviewProps) {
  if (!html) {
    return <p className="mt-2 whitespace-pre-line text-xs text-[var(--app-text-muted)]">{plainText}</p>;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[#070a11]">
      <iframe
        title={title}
        srcDoc={html}
        sandbox=""
        referrerPolicy="no-referrer"
        className={compact ? "h-[500px] w-full bg-[#070a11]" : "h-[660px] w-full bg-[#070a11]"}
      />
    </div>
  );
}
