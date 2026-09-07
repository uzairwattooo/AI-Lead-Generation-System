import type { Lead } from "@/types";
import { hostnameOf } from "./format";

const COLUMNS: Array<{ header: string; value: (lead: Lead) => string }> = [
  { header: "Company name", value: (lead) => lead.companyName },
  { header: "Category", value: (lead) => lead.category },
  { header: "Country", value: (lead) => lead.country },
  { header: "Region", value: (lead) => lead.region ?? "" },
  { header: "City", value: (lead) => lead.city ?? "" },
  { header: "Website", value: (lead) => lead.website ?? "" },
  { header: "Email", value: (lead) => lead.email ?? "" },
  { header: "Phone", value: (lead) => lead.phone ?? "" },
  { header: "Decision maker", value: (lead) => lead.decisionMaker?.name ?? "" },
  { header: "Decision maker role", value: (lead) => lead.decisionMaker?.role ?? "" },
  { header: "Opportunity signals", value: (lead) => lead.opportunitySignals.join(" | ") },
  { header: "Recommended service", value: (lead) => lead.recommendedService },
  { header: "Lead score", value: (lead) => String(lead.score) },
  { header: "Verification status", value: (lead) => lead.verificationStatus },
  { header: "Approval status", value: (lead) => lead.approvalStatus },
  { header: "Outreach status", value: (lead) => lead.outreachStatus },
  { header: "Source", value: (lead) => lead.sourceLinks[0]?.url ?? "" },
  { header: "Website host", value: (lead) => hostnameOf(lead.website) ?? "" },
  { header: "Date discovered", value: (lead) => lead.discoveredAt },
];

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function leadsToCsv(leads: Lead[]): string {
  const header = COLUMNS.map((column) => escapeCell(column.header)).join(",");
  const rows = leads.map((lead) => COLUMNS.map((column) => escapeCell(column.value(lead))).join(","));
  return [header, ...rows].join("\n");
}

/** Triggers a client-side download of the given CSV content. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
