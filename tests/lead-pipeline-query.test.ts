import assert from "node:assert/strict";
import test from "node:test";

import { applyRequestLeadKeysFilter } from "../src/server/data/lead-pipeline-query.ts";

class QueryRecorder {
  readonly filters: Array<{ column: string; values: string[] }> = [];

  in(column: string, values: string[]): this {
    this.filters.push({ column, values });
    return this;
  }
}

test("requestId lead keys filter lead_pipeline directly by lead_key", () => {
  const query = new QueryRecorder();

  applyRequestLeadKeysFilter(query, ["place:downtown", "place:antoine", "place:illusions"]);

  assert.deepEqual(query.filters, [
    {
      column: "lead_key",
      values: ["place:downtown", "place:antoine", "place:illusions"],
    },
  ]);
});

test("an absent requestId leaves the all-leads query unfiltered", () => {
  const query = new QueryRecorder();

  applyRequestLeadKeysFilter(query, null);

  assert.deepEqual(query.filters, []);
});
