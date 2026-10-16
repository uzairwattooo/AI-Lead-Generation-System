import test from "node:test";
import assert from "node:assert/strict";
import { fetchAuditHomepage, fetchFailureCode } from "../src/server/audits/homepage-fetch";
const validate = async (value: string) => new URL(value);
test("Node fetch exposes the nested network code without secret-bearing messages", () => {
 const error = new TypeError("fetch failed", { cause: Object.assign(new Error("https://provider.example/?token=secret"), {code:"ENOTFOUND"}) });
 assert.equal(fetchFailureCode(error), "ENOTFOUND");
 assert.equal(fetchFailureCode(new Error("https://provider.example/?token=secret")), "WEBSITE_FETCH_FAILED");
});
test("aggregate connection failures expose individual network codes without provider secrets",()=>{
 const cause=new AggregateError([Object.assign(new Error("token=private"),{code:"ETIMEDOUT"}),Object.assign(new Error("private hostname"),{code:"ENETUNREACH"})]);
 assert.equal(fetchFailureCode(new TypeError("fetch failed",{cause})),"ETIMEDOUT; ENETUNREACH");
});
test("missing browser configuration is explicit after a DNS failure", async t => {
 const token=process.env.BROWSERLESS_TOKEN;delete process.env.BROWSERLESS_TOKEN;
 t.mock.method(globalThis,"fetch",async()=>{throw new TypeError("fetch failed",{cause:{code:"ENOTFOUND"}});});
 try {await assert.rejects(fetchAuditHomepage("https://example.com/",validate),/ENOTFOUND; BROWSERLESS_TOKEN_MISSING/);} finally {if(token!==undefined)process.env.BROWSERLESS_TOKEN=token;}
});
test("failed browser fallback keeps both direct and provider error codes", async t => {
 const token=process.env.BROWSERLESS_TOKEN;process.env.BROWSERLESS_TOKEN="test-only";
 t.mock.method(globalThis,"fetch",async(url:Parameters<typeof fetch>[0])=>{
  if(String(url).includes("/function"))return new Response("Unauthorized",{status:401});
  return new Response("Denied",{status:403,headers:{"content-type":"text/html"}});
 });
 try {const result=await fetchAuditHomepage("https://example.com/",validate);assert.equal(result.response.status,403);assert.equal(result.directError,"HTTP_403; BROWSER_PROVIDER_HTTP_401");} finally {if(token===undefined)delete process.env.BROWSERLESS_TOKEN;else process.env.BROWSERLESS_TOKEN=token;}
});
