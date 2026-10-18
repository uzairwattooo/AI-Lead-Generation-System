import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import path from "node:path";
const folder =
  process.env.AUTOMATION_WORKFLOW_DIR || path.resolve(process.cwd(), "n8n");
const names = [
  "06-AI-Automation-Discovery.json",
  "07-AI-Agent-Outreach.json",
  "08-AI-Agent-Replies.json",
];
const workflows = names.map((n) =>
  JSON.parse(readFileSync(path.join(folder, n), "utf8")),
);
for (const [i, w] of workflows.entries())
  test("workflow " + names[i] + " is inactive, connected and compiles", () => {
    assert.equal(w.active, false);
    const ns = new Set(w.nodes.map((n: { name: string }) => n.name));
    for (const n of w.nodes) {
      if (n.type === "n8n-nodes-base.code")
        new vm.Script("(function(){" + n.parameters.jsCode + "})()");
      if (n.type === "n8n-nodes-base.httpRequest") {
        assert.match(n.parameters.url, /CODENATIVEX_DASHBOARD_URL/);
        assert.ok(
          n.parameters.headerParameters.parameters.some(
            (h: { name: string }) => h.name === "x-codenativex-intake-key",
          ),
        );
      }
    }
    for (const [name, channels] of Object.entries(w.connections)) {
      assert.ok(ns.has(name));
      for (const outputs of Object.values(
        channels as Record<string, { node: string }[][]>,
      ))
        for (const edges of outputs)
          for (const e of edges) assert.ok(ns.has(e.node));
    }
  });
const send = workflows[1];
const smtp = send.nodes.find(
  (n: { name: string }) => n.name === "Send approved agent email",
);
const code = send.nodes.find(
  (n: { name: string }) => n.name === "Build SMTP result",
).parameters.jsCode;
const claim = { id: "claim-1", send_key: "key-1", email: "team@example.com" };
function result(receipt: unknown) {
  return vm.runInNewContext("(function(){" + code + "})()", {
    $json: receipt,
    $runIndex: 0,
    $itemIndex: 0,
    $: () => ({ all: () => [{ json: claim }] }),
  })[0].json;
}
test("SMTP sends do not automatically retry", () =>
  assert.equal(smtp.retryOnFail, false));
test("SMTP acceptance requires matching recipient and a message receipt", () => {
  assert.equal(
    result({ messageId: "smtp-1", accepted: ["team@example.com"] }).accepted,
    true,
  );
  assert.equal(result({ accepted: ["team@example.com"] }).accepted, false);
  assert.equal(
    result({ messageId: "smtp-1", accepted: ["other@example.com"] }).accepted,
    false,
  );
  assert.equal(result({ error: "uncertain timeout" }).accepted, false);
});
const reply = workflows[2].nodes.find(
  (n: { name: string }) => n.name === "Normalize business reply",
).parameters.jsCode;
function normalize(json: unknown) {
  return vm.runInNewContext("(function(){" + reply + "})()", { $json: json });
}
test("IMAP reply normalizer preserves sender, receipt and reference", () => {
  const row = normalize({
    messageId: "<incoming>",
    from: "Client <team@example.com>",
    date: "2026-10-18T12:00:00Z",
    textPlain: "Yes, interested",
    headers: { "in-reply-to": "<smtp-1>" },
  })[0].json;
  assert.equal(row.sender, "team@example.com");
  assert.equal(row.references[0], "<smtp-1>");
  assert.equal(row.body, "Yes, interested");
});
test("messages without a stable receipt or body are ignored", () =>
  assert.equal(
    normalize({ from: "team@example.com", text: "hello" }).length,
    0,
  ));

test("HTML-only replies exclude quoted previous messages", () => {
  const row = normalize({
    messageId: "<html-reply>",
    from: "team@example.com",
    date: "2026-10-18T12:00:00Z",
    html: "<p>Thanks for the details.</p><blockquote>Yes please book a meeting</blockquote>",
  })[0].json;
  assert.match(row.body, /Thanks/);
  assert.doesNotMatch(row.body, /book a meeting/);
});
