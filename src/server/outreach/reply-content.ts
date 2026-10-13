import type { ReplyAction } from "./reply-policy";

export function validateVideoUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Use a public HTTPS link to the recorded 2-minute video.");
  }
  return url.toString();
}

export function buildRequestedReply(input: {
  action: Exclude<ReplyAction, "none">;
  companyName: string;
  firstName?: string | null;
  videoUrl?: string | null;
  meetingUrl?: string;
}): string {
  const greeting = input.firstName ? `Hi ${input.firstName},` : `Hi ${input.companyName} team,`;
  const report = ["report", "report_and_video"].includes(input.action);
  const video = ["video", "report_and_video"].includes(input.action);
  const paragraphs = [greeting, "Thanks for getting back to me."];
  if (report) paragraphs.push(`I've attached the website report for ${input.companyName}, with the verified findings and practical fixes.`);
  if (video) {
    if (!input.videoUrl) throw new Error("The requested video is not ready. Add this lead's recorded video link before sending.");
    paragraphs.push(`Here's the 2-minute video walkthrough you asked for:\n${validateVideoUrl(input.videoUrl)}`);
  }
  if (input.action === "booking") {
    const url = new URL(input.meetingUrl || "");
    if (url.protocol !== "https:" || url.hostname !== "calendly.com") throw new Error("A valid HTTPS Calendly booking link is required.");
    paragraphs.push(`Happy to talk through your website and the next steps. You can choose a time that works for you here:\n${url.toString()}`);
  } else paragraphs.push("Have a look whenever convenient. Happy to answer any questions.");
  paragraphs.push("Best regards,\nCode Nativex\ncodenativex.com");
  return paragraphs.join("\n\n");
}
