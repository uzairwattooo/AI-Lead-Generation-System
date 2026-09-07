import {
  Activity,
  CalendarCheck,
  CheckSquare,
  LayoutDashboard,
  ListChecks,
  Mail,
  MessageSquare,
  Search,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Longer description used by the mobile drawer and tooltips. */
  description: string;
}

export interface NavGroup {
  /** Section heading shown above the group when the sidebar is expanded. */
  label: string;
  items: NavItem[];
}

/**
 * Navigation is grouped along the pipeline: discovery first, then the
 * qualification gate, then everything that happens after approval.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Discovery",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, description: "Pipeline summary and agent health" },
      { href: "/dashboard/generate", label: "Generate Leads", icon: Search, description: "Start a new Opportunity Hunter run" },
      { href: "/dashboard/requests", label: "Lead Requests", icon: ListChecks, description: "Search history and live progress" },
    ],
  },
  {
    label: "Qualification",
    items: [
      { href: "/dashboard/leads", label: "All Leads", icon: Users, description: "Every discovered and verified lead" },
      { href: "/dashboard/approvals", label: "Approval Queue", icon: CheckSquare, description: "Approve leads before outreach" },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/dashboard/outreach", label: "Outreach", icon: Mail, description: "Email sequences and follow-ups" },
      { href: "/dashboard/replies", label: "Replies", icon: MessageSquare, description: "Classified replies and calling queue" },
      { href: "/dashboard/meetings", label: "Meetings", icon: CalendarCheck, description: "Requested and booked meetings" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/dashboard/activity", label: "Activity Logs", icon: Activity, description: "Full agent event history" },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, description: "Approval policy and outreach limits" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Human-readable segment labels used to build breadcrumbs. */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Overview",
  generate: "Generate Leads",
  requests: "Lead Requests",
  leads: "All Leads",
  approvals: "Approval Queue",
  outreach: "Outreach",
  replies: "Replies",
  meetings: "Meetings",
  activity: "Activity Logs",
  settings: "Settings",
};
