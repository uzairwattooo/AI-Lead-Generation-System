import type { Metadata } from "next";
import { ReviewListClient } from "./review-list-client";
export const metadata: Metadata = { title: "Approved Leads" };
export default function Page() { return <ReviewListClient />; }
