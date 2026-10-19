import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { COUNTRIES, BUSINESS_CATEGORIES } from "../src/lib/constants";
import { getCities, getRegions } from "../src/lib/locations";
import { searchSchema } from "../src/lib/automation/policy";
import { LocationFields } from "../src/components/discovery/location-fields";
import { AutomationDiscoveryForm } from "../src/components/discovery/automation-discovery-form";
test("every listed country has regions and every suggested region has cities", () => {
  for (const country of COUNTRIES) {
    assert.ok(getRegions(country).length, country);
    for (const region of getRegions(country)) assert.ok(getCities(country, region).length, `${country}/${region}`);
  }
  assert.ok(getCities("Pakistan", "Punjab").includes("Sargodha"));
});
test("location options are scoped to country and state, retaining custom towns", () => {
  const html = renderToStaticMarkup(createElement(LocationFields, { value: { country: "United States", region: "Florida", city: "Miami" }, onChange: () => {} }));
  assert.match(html, /Miami/); assert.match(html, /Orlando/); assert.doesNotMatch(html, /<option[^>]*>Dallas<\/option>/); assert.match(html, /Other city \/ area/);
});
test("the AI source exposes all categories and its independent approval flow", () => {
  const client = new QueryClient();
  const html = renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(AutomationDiscoveryForm)));
  assert.match(html, /All business categories/); assert.match(html, /Dental Clinics/); assert.match(html, /Marketing Agencies/); assert.match(html, /State \/ Region/); assert.match(html, /approve the business/i); assert.match(html, /workflow 06/);
  client.clear();
});
test("search schema preserves selected state, trims input, and supports existing callers", () => {
  const base = { category: "All business categories", city: " Miami ", country: "United States", limit: 5 };
  assert.equal(searchSchema.parse({ ...base, region: " Florida " }).region, "Florida");
  assert.equal(searchSchema.parse(base).region, "");
  assert.equal(searchSchema.parse(base).city, "Miami");
  assert.equal(searchSchema.safeParse({ ...base, limit: 1000 }).success, false);
  assert.ok(BUSINESS_CATEGORIES.includes("Travel Agencies"));
});
