export type ReplyAction = "report" | "video" | "report_and_video" | "booking" | "none";
export function requestedReplyAction(text: string, intent: string, reportSent?: boolean): ReplyAction {
  // Kept for callers using the old three-argument API; routing follows the latest reply.
  void reportSent;
  const latest = text.toLowerCase();
  if (["unsubscribe", "not_interested", "wrong_person", "delivery_failed", "out_of_office"].includes(intent)) return "none";
  if (/unsubscribe|remove me|stop (?:emailing|contacting)|do not contact|not interested|no thanks/.test(latest)) return "none";
  const request = latest.replace(/\b(?:don't|do not|no|not|without)\s+(?:(?:send|share|want|need)\s+)?(?:me\s+)?(?:a\s+|the\s+)?(?:video|recording|pdf|report|audit)\b/g, "");
  const asks = /\b(send|share|show|see|want|like|please|interested in|can|could|may)\b/.test(request)
    || /^(?:the\s+)?(?:pdf|report|video|recording)(?:\s+and\s+(?:pdf|report|video))?[.!\s]*$/.test(request.trim());
  const video = asks && /\b(video|recording|recorded walkthrough)\b/.test(request);
  const report = asks && /\b(pdf|report|audit|breakdown|findings|fixes)\b/.test(request);
  // An explicit asset request takes priority over the model's broad interest/meeting label.
  if (video && report) return "report_and_video";
  if (video) return "video";
  if (report) return "report";
  if (/\b(call|meeting|demo|screen.?share|google meet|zoom)\b/.test(latest) || intent === "meeting_request") return "booking";
  if (intent === "interested" || /^(?:yes|sure|sounds good|please send|send it|go ahead|ok(?:ay)?)[.!\s]*$/.test(latest.trim())) return "booking";
  return "none";
}
export function followUpDate(firstOutreachAt: string, completedFollowUps: number): string | null {
  const day = [2, 6, 13][completedFollowUps];
  const start = Date.parse(firstOutreachAt);
  return day === undefined || !Number.isFinite(start) ? null : new Date(start + day * 86_400_000).toISOString();
}
