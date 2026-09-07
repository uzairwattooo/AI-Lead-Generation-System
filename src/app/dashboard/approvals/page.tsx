import type { Metadata } from "next";

import { ApprovalsClient } from "./approvals-client";

export const metadata: Metadata = { title: "Approval Queue" };

export default function ApprovalsPage() {
  return <ApprovalsClient />;
}
