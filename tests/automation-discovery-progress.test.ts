import { test } from "node:test";
import assert from "node:assert/strict";
import { citationKey, discoveryCandidate, discoveryLocationMatches } from "../src/lib/automation/discovery-progress";
test("citation matching ignores tracking without equating different pages", () => {
  assert.equal(citationKey("https://www.store.example/help?utm_source=search#contact"), citationKey("https://store.example/help"));
  assert.notEqual(citationKey("https://store.example/help"),citationKey("https://store.example/about"));
  assert.equal(citationKey("javascript:alert(1)"),"");
});
test("known city/country aliases are accepted without accepting different cities", () => {
  assert.equal(discoveryLocationMatches({city:"NYC",country:"USA"},{city:"New York City",country:"United States"}),true);
  assert.equal(discoveryLocationMatches({city:"Rawalpindi",country:"Pakistan"},{city:"Islamabad",country:"Pakistan"}),false);
});
test("model-only fields do not invalidate an otherwise usable candidate", () => {
  const value = discoveryCandidate({company_name:"A store",region:"ICT",email:"",review_status:"approved",do_not_contact:false});
  assert.equal(value.company_name,"A store"); assert.equal(value.email,null);
  assert.equal(value.region,undefined);assert.equal(value.review_status,undefined);assert.equal(value.do_not_contact,undefined);
});
test("missing business fields are never invented from the search criteria", () => {
  const value = discoveryCandidate(null);assert.equal(value.city,undefined);assert.equal(value.website,undefined);assert.equal(value.email,null);
});
