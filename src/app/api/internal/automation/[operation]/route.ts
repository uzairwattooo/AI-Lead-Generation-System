import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleRouteError } from "@/server/api";
import { requireN8nSecret } from "@/server/internal-auth";
import {
  claimEmail,
  authorizeEmail,
  notificationResult,
  receiveReply,
  runDiscovery,
  sendResult,
} from "@/server/automation/service";
export const runtime = "nodejs";
export const maxDuration = 240;
const sendSchema = z
  .object({
    id: z.string().uuid(),
    sendKey: z.string().uuid(),
    accepted: z.boolean(),
    messageId: z.string().max(500).optional(),
    error: z.string().max(2000).optional(),
  })
  .strict();
const notificationSchema = z
  .object({
    id: z.string().uuid(),
    sendKey: z.string().uuid(),
    sent: z.boolean(),
    error: z.string().max(2000).optional(),
  })
  .strict();
const replySchema = z
  .object({
    messageId: z.string().min(3).max(500),
    sender: z.string().email().max(254),
    body: z.string().min(1).max(12000),
    receivedAt: z.string().datetime({ offset: true }),
    references: z.array(z.string().max(500)).max(30).default([]),
  })
  .strict();
export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const error = requireN8nSecret(request);
  if (error) return error;
  try {
    const { operation } = await context.params;
    if (operation === "discover")
      return NextResponse.json(await runDiscovery());
    if (operation === "next-email")
      return NextResponse.json(await claimEmail());
    if (operation === "authorize-email")
      return NextResponse.json(
        await authorizeEmail(
          z
            .object({ id: z.string().uuid(), sendKey: z.string().uuid() })
            .strict()
            .parse(await request.json()),
        ),
      );
    if (operation === "send-result")
      return NextResponse.json(
        await sendResult(sendSchema.parse(await request.json())),
      );
    if (operation === "notification-result")
      return NextResponse.json(
        await notificationResult(
          notificationSchema.parse(await request.json()),
        ),
      );
    if (operation === "reply")
      return NextResponse.json(
        await receiveReply(replySchema.parse(await request.json())),
      );
    return apiError("Unknown automation operation.", 404);
  } catch (e) {
    return handleRouteError(e);
  }
}
