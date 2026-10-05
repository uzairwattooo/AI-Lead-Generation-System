export type ReplyAction = "report" | "booking" | "none";
export function requestedReplyAction(text: string, intent: string, reportSent: boolean): ReplyAction {
  const latest = text.toLowerCase();
  if (["unsubscribe", "not_interested", "wrong_person", "delivery_failed", "out_of_office"].includes(intent)) return "none";
  if (/unsubscribe|remove me|stop (?:emailing|contacting)|do not contact|not interested|no thanks/.test(latest)) return "none";
  if (/\b(video|demo|walkthrough|screen.?share|google meet|zoom)\b|\b(?:book|schedule)\b.*\b(?:call|meeting)\b/.test(latest) || intent === "meeting_request") return "booking";
  if (/\b(?:send|share|show|see|want|like)\b.*\b(?:report|audit|breakdown|findings|fixes)\b|\b(?:report|audit|breakdown)\b.*\b(?:please|send|share)\b/.test(latest)) return "report";
  if (intent === "interested" || /^(?:yes|sure|sounds good|please send|send it|go ahead|ok(?:ay)?)[.!\s]*$/.test(latest.trim())) return reportSent ? "booking" : "report";
  return "none";
}
export function followUpDate(firstOutreachAt: string, completedFollowUps: number): string | null {
  const day = [2, 6, 13][completedFollowUps];
  const start = Date.parse(firstOutreachAt);
  return day === undefined || !Number.isFinite(start) ? null : new Date(start + day * 86_400_000).toISOString();
}
