import type { Metadata } from "next";

import { MeetingsClient } from "./meetings-client";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  return <MeetingsClient />;
}
