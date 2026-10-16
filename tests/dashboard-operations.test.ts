import test from "node:test";
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
import {retryOptions,costEstimate} from "../src/server/operations/policy";
import {storedMilestones,mergeTimeline} from "../src/server/operations/timeline";
import {claimOutreachRetry} from "../src/server/operations/outreach-retry";
import {dispatchApprovedOutreach} from "../src/server/operations/outreach-dispatch";
import {SupabaseAdapter} from "../src/server/data/supabase-adapter";
import {serverEnv,isDemoMode} from "../src/server/env";
import {replyMatches,normalizeReplyClassification} from "../src/lib/replies/filters";
import type {ReplyRecord} from "../src/types";
Object.assign(serverEnv,{supabaseUrl:"https://unit-test.supabase.co",supabaseServiceRoleKey:"unit-test",n8nOutreachWebhookUrl:"https://unit-test.n8n.test/send"});
const lead={id:"11111111-1111-4111-8111-111111111111",email:"hello@business.test",approval_status:"approved",outreach_status:"queued",email_preview_status:"approved",outreach_approved_at:"2026-10-01T00:00:00Z",updated_at:"2026-10-01T00:00:00Z",do_not_contact:false};
const option=(patch:Record<string,unknown>)=>retryOptions({...lead,...patch}).find(x=>x.kind==="outreach")!;
test("only approved unsent unclaimed outreach can retry; recent dispatches and lost receipts stay blocked",()=>{
 assert.equal(option({}).allowed,true);
 for(const patch of [{gmail_message_id:"sent"},{first_outreach_at:"2026-10-01"},{outreach_send_key:"claimed"},{outreach_status:"sending"},{approval_status:"rejected"},{do_not_contact:true},{dashboard_deleted_at:"2026-10-01"},{email_preview_status:"awaiting_approval"},{email:null},{dashboard_retry_at:new Date().toISOString()},{outreach_approved_at:new Date().toISOString()}])assert.equal(option(patch).allowed,false,JSON.stringify(patch));
 assert.equal(option({outreach_approved_at:new Date().toISOString(),last_outreach_error:"HTTP 404"}).allowed,true);
});
test("timeline only reconstructs valid recorded timestamps; merge preserves durable events",()=>{
 const old=storedMilestones({...lead,created_at:"not-a-date",first_outreach_at:"2026-10-01T10:00:00Z"});
 assert.equal(old.length,2);assert.ok(old.every(x=>x.message.includes("stored timestamp")));
 assert.equal(mergeTimeline([...old,...old]).length,2);
});
test("missing unit costs remain unknown; zero is a valid explicitly configured rate",()=>{
 const usage={audits:2,contacts:3,concepts:4};
 assert.equal(costEstimate(usage,{audit_usd:null,contacts_usd:0,concept_usd:1}).estimatedUsd,null);
 assert.equal(costEstimate(usage,{audit_usd:0,contacts_usd:"0.1",concept_usd:1}).estimatedUsd,4.3);
});
test("reply filters support combined asset requests, unhandled and normalized unsubscribes",()=>{
 const reply={classification:"unclear",requestedAction:"report_and_video",handled:false} as ReplyRecord;
 assert.equal(replyMatches(reply,"report"),true);assert.equal(replyMatches(reply,"video"),true);assert.equal(replyMatches(reply,"unhandled"),true);assert.equal(replyMatches(reply,"interested"),false);
 assert.equal(normalizeReplyClassification("unsubscribe"),"do_not_contact");assert.equal(normalizeReplyClassification("information_request"),"unclear");
});
test("missing configuration never silently enables demo data",()=>{
 const original=process.env.NEXT_PUBLIC_DEMO_MODE;delete process.env.NEXT_PUBLIC_DEMO_MODE;
 try{assert.equal(isDemoMode(),false);process.env.NEXT_PUBLIC_DEMO_MODE="true";assert.equal(isDemoMode(),true);}finally{if(original===undefined)delete process.env.NEXT_PUBLIC_DEMO_MODE;else process.env.NEXT_PUBLIC_DEMO_MODE=original;}
});
test("retry claims compare the read version and contact/send guards atomically",async t=>{
 let captured:URL|undefined;
 t.mock.method(globalThis,"fetch",async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
  captured=new URL(String(input));assert.equal(init?.method,"PATCH");return Response.json([{id:lead.id}]);
 });
 assert.equal(await claimOutreachRetry(lead),true);
 for(const field of ["gmail_message_id","first_outreach_at","outreach_send_key","dashboard_deleted_at"])assert.equal(captured!.searchParams.get(field),"is.null");
 assert.equal(captured!.searchParams.get("updated_at"),`eq.${lead.updated_at}`);
 assert.equal(captured!.searchParams.get("email_preview_status"),"eq.approved");
});
test("lost retry claim stops without dispatching or overwriting a newer lead",async t=>{
 t.mock.method(globalThis,"fetch",async()=>Response.json([]));
 assert.equal(await claimOutreachRetry(lead),false);
});
test("failed workflow dispatch is recorded while preserving email approval and SMTP claims",async t=>{
 let patch:Record<string,unknown>={};let query:URL|undefined;
 t.mock.method(globalThis,"fetch",async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
  const url=String(input);if(url.startsWith("https://unit-test.n8n.test"))return new Response("failure",{status:500});
  if(init?.method==="PATCH"){patch=JSON.parse(String(init.body));query=new URL(url);return new Response(null,{status:204});}
  return Response.json([{outreach_approved_at:lead.outreach_approved_at,gmail_message_id:null}]);
 });
 await assert.rejects(dispatchApprovedOutreach(lead.id,{leadIds:[lead.id],mode:"send_approved"}),/HTTP 500/);
 assert.equal(patch.status,"outreach_dispatch_failed");assert.equal(patch.outreach_status,undefined);assert.equal(patch.outreach_approved_at,undefined);
 assert.equal(query!.searchParams.get("outreach_send_key"),"is.null");assert.equal(query!.searchParams.get("outreach_status"),"eq.queued");
});
test("a confirmed client send remains successful if a later workflow step fails",async t=>{
 let writes=0;
 t.mock.method(globalThis,"fetch",async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
  if(String(input).startsWith("https://unit-test.n8n.test"))return new Response("failure",{status:500});
  if(init?.method==="PATCH")writes++;
  return Response.json([{outreach_approved_at:lead.outreach_approved_at,gmail_message_id:"smtp-confirmed"}]);
 });
 const result=await dispatchApprovedOutreach(lead.id,{leadIds:[lead.id],mode:"send_approved"});assert.equal(result.dispatched,true);assert.match(result.detail,/Client email was sent/);assert.equal(writes,0);
});
test("overview uses statement-time live summary and never reads reporting snapshots",async t=>{
 const urls:string[]=[];
 t.mock.method(globalThis,"fetch",async(input:Parameters<typeof fetch>[0])=>{
  const url=String(input);urls.push(url);
  if(url.includes("/rpc/"))return Response.json({mode:"live",updatedAt:"2026-10-16T00:00:00Z",metrics:{totalLeadsFound:2142},pipeline:[],outreachSummary:[]});
  return Response.json([]);
 });
 const adapter=new SupabaseAdapter(createClient("https://unit-test.supabase.co","unit-test"),"admin@test.invalid");
 const data=await adapter.getOverview();assert.equal(data.metrics.totalLeadsFound,2142);assert.equal(data.mode,"live");assert.ok(urls.some(u=>u.includes("codenativex_dashboard_live_summary")));assert.ok(urls.every(u=>!u.includes("lead_dashboard_latest")));
});
test("live record lists paginate beyond the server row cap without substituting samples",async t=>{
 const offsets:number[]=[];
 t.mock.method(globalThis,"fetch",async(input:Parameters<typeof fetch>[0])=>{
  const url=new URL(String(input));const offset=Number(url.searchParams.get("offset")||0);offsets.push(offset);
  const count=Math.min(2,5-offset);const data=Array.from({length:count},(_,i)=>({...lead,id:String(offset+i),outreach_status:"sent",company_name:`Business ${offset+i}`}));
  return Response.json(data,{headers:{"content-range":`${offset}-${offset+count-1}/5`}});
 });
 const adapter=new SupabaseAdapter(createClient("https://unit-test.supabase.co","unit-test"),"admin@test.invalid");
 assert.equal((await adapter.listOutreach()).length,5);assert.deepEqual(offsets,[0,2,4]);
});
