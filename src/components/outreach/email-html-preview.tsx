interface EmailHtmlPreviewProps {
  html: string | null | undefined;
  plainText: string;
  title: string;
  compact?: boolean;
}

export function EmailHtmlPreview({ html, plainText, title, compact = false }: EmailHtmlPreviewProps) {
  if (!html) {
    return <p className="mt-2 whitespace-pre-line text-xs text-[var(--app-text)]">{plainText}</p>;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[#070a11]">
      <iframe
        title={title}
        srcDoc={`<!doctype html><html><head><meta name="color-scheme" content="dark"><style>html,body{margin:0;padding:12px;background:#070a11!important;color:#fff!important;font:14px/1.7 Arial,sans-serif;overflow-wrap:anywhere}body *{color:#fff!important;max-width:100%;box-sizing:border-box}a{color:#93c5fd!important}</style></head><body>${html}</body></html>`}
        sandbox=""
        referrerPolicy="no-referrer"
        className={compact ? "h-[360px] w-full bg-[#070a11]" : "h-[480px] w-full bg-[#070a11]"}
      />
    </div>
  );
}
