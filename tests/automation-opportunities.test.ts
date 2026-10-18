import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assess,
  initialDraft,
  prospectSchema,
  replyIntent,
  searchSchema,
  safeError,
} from "../src/lib/automation/policy";
const input = {
  company_name: "Palm Coast Realty",
  category: "Real estate agencies",
  city: "Miami",
  country: "United States",
  website: "https://palmcoast.example",
  source_url: "https://palmcoast.example/contact",
  email: "team@palmcoast.example",
  excerpt:
    "Palm Coast Realty helps buyers find property. Contact us on WhatsApp to book a viewing.",
};
const text =
  input.excerpt + " Email team@palmcoast.example. Follow us on Instagram.";
test("public first-party evidence creates observed signals, not a claim of inbox overload", () => {
  const r = assess(input, text);
  assert.equal(r.verified, true);
  assert.equal(r.email, input.email);
  assert.ok(r.signals.some((s) => s.label === "WhatsApp contact channel"));
  assert.match(r.reason, /not verified/);
  assert.ok(r.score > 0);
});
test("guessed email is never accepted", () =>
  assert.equal(
    assess({ ...input, email: "owner@palmcoast.example" }, text).email,
    null,
  ));
test("source excerpt must be present", () => {
  const r = assess(
    {
      ...input,
      excerpt:
        "This company needs an AI agent immediately and gets thousands of messages.",
    },
    text,
  );
  assert.equal(r.verified, false);
  assert.equal(r.email, null);
  assert.equal(r.score, 0);
});
test("different business or directory cannot verify the official business identity", () => {
  assert.equal(
    assess({ ...input, company_name: "Other Broker" }, text).verified,
    false,
  );
  assert.equal(
    assess({ ...input, source_url: "https://directory.example/palm" }, text)
      .verified,
    false,
  );
});
test("www variation is permitted, untrusted social profiles are not first-party identity", () => {
  assert.equal(
    assess(
      { ...input, source_url: "https://www.palmcoast.example/contact" },
      text,
    ).verified,
    true,
  );
  assert.equal(
    assess(
      {
        ...input,
        website: "https://facebook.com/palm",
        source_url: "https://facebook.com/palm",
      },
      text,
    ).verified,
    false,
  );
});
test("draft explains connected inboxes, dashboard, leads, booking and conditional public search", () => {
  const r = initialDraft(
    "Palm Coast Realty",
    "Real estate",
    assess(input, text).signals,
  );
  assert.match(r.body, /WhatsApp/);
  assert.match(r.body, /dashboard/);
  assert.match(r.body, /qualify new leads/);
  assert.match(r.body, /Where supported/);
  assert.match(r.body, /short call/);
  assert.doesNotMatch(
    r.body,
    /guarantee|entire business|already built|thousands/i,
  );
});
test("no WhatsApp evidence means no claim of an existing WhatsApp channel", () =>
  assert.doesNotMatch(initialDraft("Business", "Retail", []).body, /WhatsApp/));
for (const value of [
  "unsubscribe",
  "Yes, but not interested",
  "no thanks",
  "Do not contact me",
])
  test("opt-out overrides positive language: " + value, () =>
    assert.equal(replyIntent(value), "stop"),
  );
test("quoted previous email does not become the current reply intent", () =>
  assert.equal(
    replyIntent("Thanks\nOn Monday someone wrote:\nYes please book a meeting"),
    "review",
  ));
test("short positive reply is eligible only for a meeting reply draft", () =>
  assert.equal(
    replyIntent("Yes, please share more information"),
    "interested",
  ));
test("unclear and negative questions stay for manual review", () =>
  assert.equal(replyIntent("How did you get my email address?"), "review"));
test("discovery validates counts and public contact URLs", () => {
  assert.equal(
    searchSchema.safeParse({
      category: "Agency",
      city: "Miami",
      country: "United States",
      limit: 11,
    }).success,
    false,
  );
  assert.equal(
    prospectSchema.safeParse({ ...input, website: "http://localhost:3000" })
      .success,
    false,
  );
  assert.equal(
    prospectSchema.safeParse({
      ...input,
      source_url: "https://user:pass@example.com",
    }).success,
    false,
  );
});
test("secrets are redacted from provider errors", () =>
  assert.doesNotMatch(
    safeError("Bearer private123 sk-secret123"),
    /private123|sk-secret123/,
  ));

test("similar business names and email substrings are not treated as verified matches", () => {
  assert.equal(
    assess({ ...input, company_name: "Palm Bay Realty" }, text).verified,
    false,
  );
  assert.equal(
    assess(
      input,
      text.replace("team@palmcoast.example", "notteam@palmcoast.example"),
    ).email,
    null,
  );
});
