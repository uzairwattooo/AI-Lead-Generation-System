import type { Lead } from "@/types";
import { leadProgress } from "./progress";

/** Match the displayed progress badge before sorting, counting and pagination. */
export function matchesLeadOutreachFilter(lead: Lead, selected?: readonly string[]): boolean {
  if (!selected?.length) return true;
  if (lead.dashboardDeletedAt) return false;
  return selected.some((status) => status === "approved_not_prepared"
    ? leadProgress(lead).label === "Approved · Not prepared"
    : status === lead.outreachStatus);
}
