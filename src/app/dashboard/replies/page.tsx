import type { Metadata } from "next";

import { RepliesClient } from "./replies-client";

export const metadata: Metadata = { title: "Replies" };

export default function RepliesPage() {
  return <RepliesClient />;
}
