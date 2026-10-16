import test from "node:test";
import assert from "node:assert/strict";
import { POST as context } from "../src/app/api/internal/outreach/context/route";
import { POST as result } from "../src/app/api/internal/outreach/result/route";
import { serverEnv } from "../src/server/env";
import { websiteDevelopmentEmail } from "../src/server/outreach/website-development";
import { renderProfessionalEmail } from "../src/server/outreach/email-template";
import { conceptEmail } from "../src/server/lead-tools/policy";

Object.assign(serverEnv,{supabaseUrl:"https://unit-test.supabase.co",supabaseServiceRoleKey:"unit-test",n8nWebhookSecret:"unit-test"});
const id="11111111-1111-4111-8111-111111111111";
const copy=websiteDevelopmentEmail("Halo Salon","Austin");
const rendered=renderProfessionalEmail({companyName:"Halo Salon",body:copy.body,findings:[]});
const lead={id,lead_key:"halo",company_name:"Halo Salon",city:"Austin",website:null,outreach_kind:"website_development",audit_status:"website_missing",approval_status:"approved",do_not_contact:false,email:"hello@halosalon.test",email_validation_status:"syntax_valid",outreach_status:"queued",email_preview_status:"approved",outreach_approved_at:"2026-10-16T00:00:00Z",outreach_subject:copy.subject,outreach_plain_text_body:rendered.plainText,outreach_html_body:rendered.html};
function request(body:unknown){return new Request("https://dashboard.test/api/internal/outreach/context",{method:"POST",headers:{"content-type":"application/json","x-codenativex-intake-key":"unit-test"},body:JSON.stringify(body)});}
test("approved development draft reaches the atomic send claim without an audit or PDF",async t=>{
 const patches:unknown[]=[];
 t.mock.method(globalThis,"fetch",async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
  const url=String(input);assert.match(url,/unit-test\.supabase\.co/);
  if(init?.method==="PATCH"){patches.push(JSON.parse(String(init.body)));return Response.json([{id}]);}
  return Response.json(url.includes("lead_discovery_candidates")?[]:[lead]);
 });
 const response=await context(request({leadId:id,mode:"send_approved"}));
 assert.equal(response.status,200,await response.clone().text());const body=await response.json();
 assert.equal(body.outreachKind,"website_development");assert.equal(body.includeConcept,false);assert.equal(body.html,rendered.html);assert.equal(patches.length,1);
});
test("unapproved, edited or now-website-present development drafts cannot claim a send",async t=>{
 for(const patch of [{email_preview_status:"awaiting_approval"},{outreach_html_body:"old audit email"},{approval_status:"rejected"},{foundWebsite:true},{outreach_send_key:"claimed"},{first_outreach_at:"2026-10-16"},{gmail_message_id:"sent"}]){
  let writes=0;
  const mock=t.mock.method(globalThis,"fetch",async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
   if(init?.method==="PATCH"&&JSON.parse(String(init.body)).outreach_status==="sending")writes++;
   return Response.json(String(input).includes("lead_discovery_candidates")?("foundWebsite" in patch?[{website:"https://found.test"}]:[]):[{...lead,...patch}]);
  });
  const response=await context(request({leadId:id,mode:"send_approved"}));assert.equal(response.status,409);assert.equal(writes,0);mock.mock.restore();
 }
});
test("SMTP receipt persists notification and sent status without enrolling in audit follow-ups",async t=>{
 let saved:Record<string,unknown>={};
 t.mock.method(globalThis,"fetch",async(_input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
  if(init?.method==="PATCH"){saved=JSON.parse(String(init.body));return Response.json([{id}]);}
  return Response.json([{outreach_kind:"website_development"}]);
 });
 const response=await result(request({leadId:id,sendKey:id,outcome:"sent",gmailMessageId:"smtp-message",gmailThreadId:"smtp-thread"}));
 assert.equal(response.status,200,await response.clone().text());assert.equal(saved.outreach_status,"sent");assert.equal(saved.admin_notification_status,"pending");assert.equal(saved.next_follow_up_at,null);assert.equal(saved.next_workflow,null);
});
test("concept send permits the www alias and blocks another website or unfinished job",async t=>{
 const concept=conceptEmail("Halo Salon");
 const email=renderProfessionalEmail({companyName:"Halo Salon",body:concept.body,findings:[]});
 const conceptLead={...lead,website:"https://www.halosalon.test/",outreach_kind:"website_audit",audit_status:"audit_completed",outreach_include_concept:true,visual_concept_path:"comparison.png",visual_concept_job_id:id,outreach_subject:concept.subject,outreach_plain_text_body:email.plainText,outreach_html_body:email.html};
 for(const [website,status,expected] of [["https://halosalon.test/","completed",200],["https://other.test/","completed",409],["https://halosalon.test/","processing",409]] as const){
  let writes=0;
  const mock=t.mock.method(globalThis,"fetch",async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
   if(init?.method==="PATCH"){if(JSON.parse(String(init.body)).outreach_status==="sending")writes++;return Response.json([{id}]);}
   return Response.json(String(input).includes("codenativex_lead_tool_jobs")?[{target:{website},status}]:[conceptLead]);
  });
  const response=await context(request({leadId:id,mode:"send_approved"}));
  assert.equal(response.status,expected,await response.clone().text());assert.equal(writes,expected===200?1:0);mock.mock.restore();
 }
});
test("pre-send validation errors are saved for dashboard review without claiming SMTP",async t=>{
 const writes:Record<string,unknown>[]=[];
 t.mock.method(globalThis,"fetch",async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
  if(init?.method==="PATCH"){writes.push(JSON.parse(String(init.body)));return new Response(null,{status:204});}
  return Response.json(String(input).includes("lead_discovery_candidates")?[]:[{...lead,outreach_html_body:"unapproved old copy"}]);
 });
 const response=await context(request({leadId:id,mode:"send_approved"}));
 assert.equal(response.status,409);assert.equal(writes.length,1);assert.match(String(writes[0]!.last_outreach_error),/Regenerate and approve/);assert.equal(writes[0]!.outreach_send_key,undefined);
});
