import type { Metadata } from "next";

import { RequestDetailClient } from "./request-detail-client";

export const metadata: Metadata = { title: "Request details" };

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestDetailClient requestId={id} />;
}
