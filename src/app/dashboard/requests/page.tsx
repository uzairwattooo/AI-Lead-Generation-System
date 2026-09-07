import type { Metadata } from "next";

import { RequestsClient } from "./requests-client";

export const metadata: Metadata = { title: "Lead Requests" };

export default function RequestsPage() {
  return <RequestsClient />;
}
