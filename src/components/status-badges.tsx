import {
  APPROVAL_STATUS_LABELS,
  MEETING_STATUS_LABELS,
  OUTREACH_STATUS_LABELS,
  REPLY_CLASSIFICATION_LABELS,
  REQUEST_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "@/lib/constants";
import { POTENTIAL_LABELS, leadPotential } from "@/lib/format";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type {
  ApprovalStatus,
  LeadRequestStatus,
  MeetingStatus,
  OutreachStatus,
  ReplyClassification,
  VerificationStatus,
} from "@/types";

type Tone = NonNullable<BadgeProps["tone"]>;

const REQUEST_TONES: Record<LeadRequestStatus, Tone> = {
  queued: "neutral",
  running: "info",
  searching: "info",
  enriching: "info",
  validating: "info",
  deduplicating: "info",
  scoring: "info",
  completed: "success",
  needs_review: "warning",
  failed: "danger",
  cancelled: "neutral",
};

export function RequestStatusBadge({ status }: { status: LeadRequestStatus }) {
  return <Badge tone={REQUEST_TONES[status]}>{REQUEST_STATUS_LABELS[status]}</Badge>;
}

const VERIFICATION_TONES: Record<VerificationStatus, Tone> = {
  unverified: "neutral",
  pending: "info",
  verified: "success",
  invalid: "danger",
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <Badge tone={VERIFICATION_TONES[status]}>{VERIFICATION_STATUS_LABELS[status]}</Badge>;
}

const APPROVAL_TONES: Record<ApprovalStatus, Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  return <Badge tone={APPROVAL_TONES[status]}>{APPROVAL_STATUS_LABELS[status]}</Badge>;
}

const OUTREACH_TONES: Record<OutreachStatus, Tone> = {
  not_queued: "neutral",
  email_draft_ready: "info",
  awaiting_approval: "warning",
  queued: "neutral",
  awaiting_reply: "info",
  outreach_failed: "danger",
  outreach_blocked: "danger",
  initial_email_sent: "info",
  follow_up_1: "info",
  follow_up_2: "info",
  follow_up_3: "info",
  replied: "info",
  interested: "success",
  not_interested: "neutral",
  do_not_contact: "danger",
  calling_queue: "warning",
  meeting_booked: "success",
  needs_human_review: "warning",
};

export function OutreachBadge({ status }: { status: OutreachStatus }) {
  return <Badge tone={OUTREACH_TONES[status]}>{OUTREACH_STATUS_LABELS[status]}</Badge>;
}

const REPLY_TONES: Record<ReplyClassification, Tone> = {
  interested: "success",
  pricing_question: "info",
  meeting_request: "success",
  not_interested: "neutral",
  do_not_contact: "danger",
  unclear: "warning",
};

export function ReplyBadge({ classification }: { classification: ReplyClassification }) {
  return <Badge tone={REPLY_TONES[classification]}>{REPLY_CLASSIFICATION_LABELS[classification]}</Badge>;
}

const MEETING_TONES: Record<MeetingStatus, Tone> = {
  requested: "warning",
  scheduled: "info",
  completed: "success",
  no_show: "danger",
  cancelled: "neutral",
};

export function MeetingBadge({ status }: { status: MeetingStatus }) {
  return <Badge tone={MEETING_TONES[status]}>{MEETING_STATUS_LABELS[status]}</Badge>;
}

/** Numeric score plus its potential band (80+ high, 60-79 medium, below 60 low). */
export function ScoreBadge({ score }: { score: number }) {
  const potential = leadPotential(score);
  const tone: Tone = potential === "high" ? "success" : potential === "medium" ? "info" : "neutral";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular-nums text-sm font-semibold">{score}</span>
      <Badge tone={tone}>{POTENTIAL_LABELS[potential]}</Badge>
    </span>
  );
}
