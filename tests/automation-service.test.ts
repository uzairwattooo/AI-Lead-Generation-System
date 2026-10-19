import { test } from "node:test";
import assert from "node:assert/strict";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://unit-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
process.env.CODENATIVEX_ADMIN_NOTIFICATION_EMAIL = "admin@example.com";
const servicePromise = import("../src/server/automation/service");
const id = "11111111-1111-4111-8111-111111111111",
  key = "22222222-2222-4222-8222-222222222222",
  oid = "33333333-3333-4333-8333-333333333333";
const row = {
  id,
  opportunity_id: oid,
  kind: "initial",
  email: "team@example.com",
  subject: "AI assistant",
  body: "Reviewed email body",
  status: "draft",
  send_key: null,
  message_id: null,
  updated_at: "2026-10-18T12:00:00Z",
};
test("stale email approval is rejected before any mutation", async (t) => {
  const service = await servicePromise;
  let writes = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (init?.method && init.method !== "GET") writes++;
      return Response.json(row);
    },
  );
  await assert.rejects(
    service.editEmail(
      id,
      "approve_send",
      undefined,
      undefined,
      "2026-10-17T12:00:00Z",
    ),
    /changed/,
  );
  assert.equal(writes, 0);
});
test("an SMTP claim cannot be approved or edited again", async (t) => {
  const service = await servicePromise;
  let writes = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (init?.method && init.method !== "GET") writes++;
      return Response.json({ ...row, status: "sending", send_key: key });
    },
  );
  await assert.rejects(
    service.editEmail(id, "approve_send", undefined, undefined, row.updated_at),
    /unsent draft/,
  );
  assert.equal(writes, 0);
});
test("confirmed receipt callbacks are idempotent and do not change a sent email", async (t) => {
  const service = await servicePromise;
  let writes = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (init?.method === "PATCH") writes++;
      return Response.json({
        email: row.email,
        status: "sent",
        message_id: "<sent>",
        send_key: key,
      });
    },
  );
  assert.deepEqual(
    await service.sendResult({
      id,
      sendKey: key,
      accepted: true,
      messageId: "<sent>",
    }),
    { saved: true, sent: true, notificationEmail: null },
  );
  assert.equal(writes, 0);
});
test("a wrong send key cannot persist a receipt", async (t) => {
  const service = await servicePromise;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ email: row.email, status: "sending", send_key: "other" }),
  );
  await assert.rejects(
    service.sendResult({
      id,
      sendKey: key,
      accepted: true,
      messageId: "<sent>",
    }),
    /does not match/,
  );
});
test("ambiguous SMTP failure remains failed with its claim retained", async (t) => {
  const service = await servicePromise;
  let patch: Record<string, unknown> = {};
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (init?.method === "PATCH") {
        patch = JSON.parse(String(init.body));
        return new Response(null, { status: 204 });
      }
      return Response.json({
        email: row.email,
        status: "sending",
        send_key: key,
        smtp_authorized_at: "2026-10-18T12:00:00Z",
      });
    },
  );
  const result = await service.sendResult({
    id,
    sendKey: key,
    accepted: false,
    error: "SMTP timeout Bearer sensitive",
  });
  assert.equal(result.sent, false);
  assert.equal(patch.status, "failed");
  assert.equal(Object.hasOwn(patch, "send_key"), false);
  assert.doesNotMatch(String(patch.error), /sensitive/);
});
test("opt-out suppresses both campaigns and cancels unsent drafts", async (t) => {
  const service = await servicePromise;
  const mutations: { table: string; body: Record<string, unknown> }[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const table = new URL(String(input)).pathname.split("/").pop() || "";
      const method = init?.method || "GET";
      if (method === "GET") {
        if (table === "automation_outbox")
          return Response.json([
            {
              opportunity_id: oid,
              message_id: "<outbound>",
              sent_at: "2026-10-17T00:00:00Z",
              subject: "Hello",
            },
          ]);
        return Response.json({
          id: oid,
          kind: "business",
          company_name: "Business",
          review_status: "approved",
          do_not_contact: false,
        });
      }
      mutations.push({ table, body: JSON.parse(String(init?.body)) });
      return table === "automation_reply_events" && method === "POST"
        ? Response.json([{ message_id: "<reply-1>" }])
        : new Response(null, { status: 204 });
    },
  );
  const result = await service.receiveReply({
    messageId: "<reply-1>",
    sender: "team@example.com",
    body: "No thanks. Stop emailing.",
    receivedAt: "2026-10-18T12:00:00Z",
    references: ["<outbound>"],
  });
  assert.equal(result.intent, "stop");
  assert.ok(mutations.some((x) => x.table === "automation_suppressions"));
  assert.ok(
    mutations.some(
      (x) => x.table === "lead_pipeline" && x.body.do_not_contact === true,
    ),
  );
  assert.ok(
    mutations.some(
      (x) => x.table === "automation_outbox" && x.body.status === "cancelled",
    ),
  );
  assert.ok(
    !mutations.some(
      (x) => x.table === "automation_outbox" && x.body.kind === "booking_reply",
    ),
  );
});
test("missing search key leaves the paid discovery queue untouched", async (t) => {
  const service = await servicePromise;
  delete process.env.OPENAI_API_KEY;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new Error("Unexpected network call");
  });
  await assert.rejects(service.runDiscovery(), /OPENAI_API_KEY/);
  assert.equal(calls, 0);
});

test("SMTP permission cannot be consumed twice", async (t) => {
  const service = await servicePromise;
  let writes = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (init?.method === "PATCH") writes++;
      return Response.json({
        ...row,
        status: "sending",
        send_key: key,
        smtp_authorized_at: "2026-10-18T12:00:00Z",
      });
    },
  );
  await assert.rejects(
    service.authorizeEmail({ id, sendKey: key }),
    /already used/,
  );
  assert.equal(writes, 0);
});

test("final SMTP permission rechecks the latest opt-out and cancels an unsent claim", async (t) => {
  const service = await servicePromise;
  let cancelled = false;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const table = new URL(String(input)).pathname.split("/").pop();
      if (init?.method === "PATCH") {
        cancelled = JSON.parse(String(init.body)).status === "cancelled";
        return new Response(null, { status: 204 });
      }
      if (table === "automation_outbox")
        return Response.json({
          ...row,
          status: "sending",
          send_key: key,
          smtp_authorized_at: null,
        });
      return Response.json({
        id: oid,
        kind: "business",
        review_status: "approved",
        source_verified: true,
        email: row.email,
        do_not_contact: true,
      });
    },
  );
  await assert.rejects(
    service.authorizeEmail({ id, sendKey: key }),
    /Approve a source-verified/,
  );
  assert.equal(cancelled, true);
});
test("valid SMTP permission is consumed with a compare-and-set filter", async (t) => {
  const service = await servicePromise;
  let permissionUrl = "";
  t.mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = new URL(String(input));
      const table = url.pathname.split("/").pop();
      if (init?.method === "PATCH") {
        permissionUrl = url.toString();
        assert.ok(JSON.parse(String(init.body)).smtp_authorized_at);
        return Response.json([{ id }]);
      }
      if (table === "automation_outbox")
        return Response.json({
          ...row,
          status: "sending",
          send_key: key,
          smtp_authorized_at: null,
        });
      if (table === "automation_opportunities")
        return Response.json({
          id: oid,
          kind: "business",
          review_status: "approved",
          source_verified: true,
          email: row.email,
          do_not_contact: false,
        });
      return Response.json([]);
    },
  );
  assert.deepEqual(await service.authorizeEmail({ id, sendKey: key }), {
    authorized: true,
  });
  assert.match(permissionUrl, /smtp_authorized_at=is.null/);
  assert.match(permissionUrl, /status=eq.sending/);
});
test("losing the one-time SMTP permission stops execution", async (t) => {
  const service = await servicePromise;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const table = new URL(String(input)).pathname.split("/").pop();
      if (init?.method === "PATCH") return Response.json([]);
      if (table === "automation_outbox")
        return Response.json({
          ...row,
          status: "sending",
          send_key: key,
          smtp_authorized_at: null,
        });
      if (table === "automation_opportunities")
        return Response.json({
          id: oid,
          kind: "business",
          review_status: "approved",
          source_verified: true,
          email: row.email,
          do_not_contact: false,
        });
      return Response.json([]);
    },
  );
  await assert.rejects(
    service.authorizeEmail({ id, sendKey: key }),
    /already consumed/,
  );
});

test("discovery passes state and selected category to search without sending email", async (t) => {
  const service = await servicePromise;
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only-do-not-use";
  t.after(() => { if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; });
  let searches = 0;
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input);
    if (url.includes("api.openai.com")) {
      searches++;
      const request = JSON.parse(String(init?.body));
      const criteria = JSON.parse(request.input);
      assert.equal(criteria.region, "Florida");
      assert.equal(criteria.city, "Miami");
      assert.equal(criteria.category, "Dental Clinics");
      assert.match(request.instructions, /state\/region/);
      return Response.json({ output: [{ type: "message", content: [{ type: "output_text", text: '{"businesses":[]}' }] }] });
    }
    if (url.includes("automation_claim_job")) return Response.json([{ id, category: "Dental Clinics", region: "Florida", city: "Miami", country: "United States", kind: "business", requested_count: 5 }]);
    assert.ok(!url.includes("automation_outbox"), "discovery must not queue or send emails");
    return Response.json([]);
  });
  const result = await service.runDiscovery();
  assert.equal(result.processed, true);
  assert.equal(searches, 1);
});
