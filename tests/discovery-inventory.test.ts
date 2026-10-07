import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { recommendedDiscoveryIds } from "../src/server/data/discovery-ranking.ts";

type WorkflowNode = {
  name: string;
  parameters: {
    jsCode?: string;
    conditions?: { conditions?: Array<{ leftValue?: string }> };
    fieldsUi?: { fieldValues: Array<{ fieldId: string; fieldValue: string }> };
  };
};

function workflow(file: string): { nodes: WorkflowNode[] } {
  return JSON.parse(readFileSync(`n8n/${file}`, "utf8")) as { nodes: WorkflowNode[] };
}

test("recommendations mark the best two without dropping incomplete discoveries", () => {
  const records = [
    { id: "complete", email: "hello@example.com", phone: "+1", website: "https://example.com", sourceLinks: [{}], discoveredAt: "2026-10-07T00:00:00Z" },
    { id: "website-email", email: "team@example.org", phone: null, website: "https://example.org", sourceLinks: [{}], discoveredAt: "2026-10-07T00:01:00Z" },
    { id: "phone-only", email: null, phone: "+2", website: null, sourceLinks: [{}], discoveredAt: "2026-10-07T00:02:00Z" },
    { id: "name-only", email: null, phone: null, website: null, sourceLinks: [], discoveredAt: "2026-10-07T00:03:00Z" },
  ];

  const recommended = recommendedDiscoveryIds(records);

  assert.equal(records.length, 4);
  assert.deepEqual([...recommended.entries()], [["complete", 1], ["website-email", 2]]);
  assert.equal(recommended.has("phone-only"), false);
  assert.equal(recommended.has("name-only"), false);
});

test("human-review migration is additive and stops new requests after discovery", () => {
  const sql = readFileSync(
    "supabase/migrations/202610070001_discovery_inventory_human_review.sql",
    "utf8",
  );

  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.match(sql, /stop_after_discovery/i);
  assert.match(sql, /recommended_lead_count|recommendation_rank/i);
  assert.match(sql, /codenativex_promote_discovery_candidate/i);
});

test("candidate deduplication is request-scoped and the repair migration is non-destructive", () => {
  const sql = readFileSync(
    "supabase/migrations/202610070004_request_scoped_candidate_dedup.sql",
    "utf8",
  );

  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /sql_identifier\[\]\s*=\s*text\[\]/i);
  assert.match(sql, /lead_discovery_candidates \(job_id, lead_key\)/i);
  assert.match(sql, /count\(\*\) = 1/i);
  assert.match(sql, /max\(key_info\.column_name::text\) = 'lead_key'/i);
});

test("every public discovery source keeps normalized records for human review", () => {
  const files = [
    "00D-LinkedIn-Public-Discovery-Human-Review.json",
    "00E-Job-Platforms-Discovery-Human-Review.json",
    "00F-Agency-Collaboration-Discovery-Human-Review.json",
    "00G-Google-Intent-Discovery-Human-Review.json",
  ];

  for (const file of files) {
    const exported = workflow(file);
    const build = exported.nodes.find((node) => node.name === "Build Public Signal Analysis Prompt");
    const gate = exported.nodes.find((node) => node.name === "Promote Signal to Candidate?");
    const create = exported.nodes.find((node) => /^Create .* Discovery Candidate$/.test(node.name));
    const reconcile = exported.nodes.find((node) => /^Reconcile .* Completion$/.test(node.name));

    assert.ok(build?.parameters.jsCode);
    assert.doesNotMatch(build.parameters.jsCode, /if \(!signalHint\) continue/);
    assert.match(build.parameters.jsCode, /records\.length >= Math\.max\(1, Number\(job\.requested_leads/);
    assert.match(gate?.parameters.conditions?.conditions?.[0]?.leftValue ?? "", /signal_saved === true/);

    const fields = new Map(create?.parameters.fieldsUi?.fieldValues.map((field) => [field.fieldId, field.fieldValue]));
    assert.equal(fields.get("intake_status"), "manual_review_required");
    assert.equal(fields.get("review_status"), "pending");
    assert.match(reconcile?.parameters.jsCode ?? "", /final_status: available > 0 \? 'needs_review'/);
    assert.match(reconcile?.parameters.jsCode ?? "", /next_workflow: ''/);
  }
});

test("intake controller preserves human-review mode for dashboard jobs", () => {
  const intake = workflow("00A-Lead-Discovery-Job-Intake-Human-Review.json");
  const validate = intake.nodes.find((node) => node.name === "Validate & Build Job Request");
  assert.match(validate?.parameters.jsCode ?? "", /processing_mode: "human_review"/);
  assert.match(validate?.parameters.jsCode ?? "", /keep_all_discovered: true/);
});
