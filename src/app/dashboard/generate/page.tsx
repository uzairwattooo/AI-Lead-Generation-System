import type { Metadata } from "next";

import { GenerateLeadsForm } from "./generate-form";

export const metadata: Metadata = { title: "Generate Leads" };

export default function GenerateLeadsPage() {
  return <GenerateLeadsForm />;
}
