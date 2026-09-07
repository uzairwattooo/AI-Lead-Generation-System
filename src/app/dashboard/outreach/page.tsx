import type { Metadata } from "next";

import { OutreachClient } from "./outreach-client";

export const metadata: Metadata = { title: "Outreach" };

export default function OutreachPage() {
  return <OutreachClient />;
}
