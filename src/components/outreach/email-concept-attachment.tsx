"use client";

import Image from "next/image";
import { useState } from "react";

interface Props {
  leadId: string;
  version?: string | null;
  available: boolean;
}

export function EmailConceptAttachment({ leadId, version, available }: Props) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const endpoint = `/api/leads/${encodeURIComponent(leadId)}/concept`;
  const source = `${endpoint}?version=${encodeURIComponent(version || "current")}`;
  return (
    <section aria-label="Email image attachment" className="mt-3 space-y-2 rounded-md border border-[var(--app-border)] p-3">
      <p className="text-xs font-semibold">Image attachment · homepage-before-after.png</p>
      <p className="text-xs text-[var(--app-text-muted)]">Selected for this draft. Attached when you approve and send the email.</p>
      {!available ? <p role="alert" className="text-xs text-amber-500">The selected image is unavailable. Capture the homepage again before sending.</p> : (
        <>
          {failedSource === source ? <p role="alert" className="text-xs text-amber-500">Image preview could not load. Open the full image below to check it.</p> : (
            <a href={source} target="_blank" rel="noopener noreferrer" aria-label="Open full before and after homepage image">
              <Image unoptimized src={source} width={1552} height={1716} alt="Original homepage beside the proposed homepage design, selected as the email attachment" className="max-h-[480px] w-full rounded border border-[var(--app-border)] object-contain" onError={() => setFailedSource(source)} />
            </a>
          )}
          <div className="flex flex-wrap gap-3 text-xs underline">
            <a href={source} target="_blank" rel="noopener noreferrer">Full attachment</a>
            <a href={`${endpoint}?kind=before`} target="_blank" rel="noopener noreferrer">Original screenshot</a>
            <a href={`${endpoint}?kind=after`} target="_blank" rel="noopener noreferrer">Proposed homepage</a>
          </div>
        </>
      )}
    </section>
  );
}
