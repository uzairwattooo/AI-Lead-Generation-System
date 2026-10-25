import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AutomationClient from "../src/app/dashboard/automation/automation-client";
test("new section renders real query data, public evidence controls and the approval flow", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(["automation-opportunities"], {
    opportunities: [
      {
        id: "one",
        kind: "business",
        company_name: "Observed Agency",
        category: "Real estate agency",
        city: "Miami",
        country: "United States",
        email: "team@example.com",
        source_url: "https://example.com/contact",
        excerpt: "A public source excerpt describing an enquiry channel.",
        source_verified: true,
        review_status: "pending",
        do_not_contact: false,
        score: 54,
        signals: [],
        capabilities: ["Shared enquiry dashboard"],
        reason: "Potential fit, not verified demand.",
      },
    ],
    outbox: [],
    jobs: [],
    limit: 300,
    updatedAt: "2026-10-18T12:00:00Z",
  });
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AutomationClient),
    ),
  );
  assert.match(html, /AI Automation Opportunities/);
  assert.match(html, /Observed Agency/);
  assert.match(html, /team@example.com/);
  assert.match(html, /Approve opportunity/);
  assert.match(html, /Public buying requests/);
  assert.match(html, /Source verified/);
  assert.doesNotMatch(html, /No opportunities in this view/);
  client.clear();
});

