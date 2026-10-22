import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { followUpRetryBlockReason, FOLLOW_UP_WORKFLOW } from "../src/server/operations/follow-up-policy";
import { retryOptions } from "../src/server/operations/policy";
import { claimFollowUpRetry } from "../src/server/operations/follow-up-retry";
const lead = {
 id:"11111111-1111-4111-8111-111111111111",email:"owner@example.test",email_validation_status:"syntax_valid",
 approval_status:"approved",do_not_contact:false,reply_received_at:null,reply_status:"pending",
 status:"follow_up_failed",outreach_status:"failed",outreach_id:"followup-failed-claim",
 first_outreach_at:"2026-10-13T07:10:00Z",gmail_message_id:"<initial>",gmail_thread_id:"<thread>",
 outreach_send_key:"initial-send-claim-keep",follow_up_count:0,outreach_attempts:1,last_follow_up_at:null,
 last_outreach_error:"follow_up_generation_attempt=3; model_error: OpenAI: Rate limit reached",
 updated_at:"2026-10-18T12:00:00Z",email_preview_status:"sent",outreach_body:"Initial email body must stay unchanged"
};
test("initial-send locks remain active while generation-only follow-up recovery is available",()=>{
 const options=retryOptions(lead);assert.equal(options.find(x=>x.kind==='follow_up')!.allowed,true);
 assert.ok(options.filter(x=>x.kind!=='follow_up').every(x=>!x.allowed));
 assert.equal(followUpRetryBlockReason(lead),null);
});
for (const [name,patch] of Object.entries({
 deleted:{dashboard_deleted_at:"2026-10-20"},optout:{do_not_contact:true},unapproved:{approval_status:"pending"},rejected:{approval_status:"rejected"},
 replied:{reply_received_at:"2026-10-20"},replyStatus:{reply_status:"received"},bounce:{reply_status:"delivery_failed"},
 activeClaim:{status:"follow_up_preparing",outreach_status:"follow_up_generating"},queued:{status:"awaiting_reply"},
 sendFailed:{last_outreach_error:"smtp_follow_up_send_failed_ambiguous_do_not_retry"},
 mixedError:{last_outreach_error:"follow_up_generation_attempt=3; model_error: smtp ambiguous"},
 missingReceipt:{gmail_message_id:null},missingThread:{gmail_thread_id:null},missingClaim:{outreach_id:null},
 missingInitial:{first_outreach_at:null},badEmail:{email:"invalid"},uncheckedEmail:{email_validation_status:"unknown"},
 missingWebsite:{audit_status:"website_missing"},newWebsiteOffer:{outreach_kind:"website_development"},
 complete:{follow_up_count:3,outreach_attempts:4},badCounters:{follow_up_count:1,outreach_attempts:1},recent:{dashboard_retry_at:new Date().toISOString()}
})) test(`policy blocks ${name}`,()=>assert.ok(followUpRetryBlockReason({...lead,...patch})));
for(const text of ['ai_json_parse_failed; missing_body; invalid_word_count; model_error','missing_body','invalid_word_count'])
 test(`generation validation failure can recover: ${text}`,()=>assert.equal(followUpRetryBlockReason({...lead,last_outreach_error:'follow_up_generation_attempt=3; '+text}),null));
const client=()=>createClient('https://unit-test.supabase.co','unit-test');
const gen=[{outcome:'follow_up_generation_failed',message_id:'<initial>',sequence_no:1}];
async function mockHistory(t: TestContext, options:{events?:unknown[];receipts?:unknown[];lost?:boolean;dbError?:boolean}={}) {
 const writes:{body:Record<string,unknown>;url:URL}[]=[];
 t.mock.method(globalThis,'fetch',async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
  const url=new URL(String(input));
  if(init?.method==='PATCH'){writes.push({body:JSON.parse(String(init.body)),url});return Response.json(options.lost?[]:{id:lead.id});}
  if(options.dbError)return Response.json({message:'history unavailable'},{status:500});
  assert.match(url.pathname,/lead_outreach_events$/);
  return Response.json(url.searchParams.has('outreach_id')?(options.events??gen):(options.receipts??[]));
 });return writes;
}
test("retry schedules only workflow04 without changing sent records or contacting SMTP/OpenAI",async t=>{
 const writes=await mockHistory(t);
 const result=await claimFollowUpRetry(lead,client());assert.ok(result?.queued);assert.equal(writes.length,1);
 const {body,url}=writes[0]!;assert.equal(body.status,'awaiting_reply');assert.equal(body.next_workflow,FOLLOW_UP_WORKFLOW);
 assert.equal(body.outreach_status,'follow_up_generation_retry');assert.equal(body.last_outreach_error,null);
 assert.ok(Date.parse(String(body.next_follow_up_at))>=Date.now()+55000);
 for(const name of ['gmail_message_id','gmail_thread_id','first_outreach_at','outreach_send_key','follow_up_count','outreach_attempts','last_follow_up_at','outreach_body','email_preview_status','email','outreach_id'])assert.equal(body[name],undefined,name);
 for(const name of ['updated_at','status','outreach_status','outreach_id','last_outreach_error','email','gmail_message_id','gmail_thread_id','first_outreach_at','reply_status','follow_up_count','outreach_attempts'])assert.ok(url.searchParams.has(name),name);
 assert.equal(url.searchParams.get('reply_received_at'),'is.null');assert.equal(url.searchParams.get('dashboard_deleted_at'),'is.null');
 assert.equal(url.searchParams.get('do_not_contact'),'eq.false');assert.equal(url.searchParams.get('approval_status'),'eq.approved');
});
test("a verified sent follow-up keeps its existing count and resumes the next stage",async t=>{
 const writes=await mockHistory(t,{receipts:[{message_id:'<followup-1>',sequence_no:2}]});
 assert.ok(await claimFollowUpRetry({...lead,follow_up_count:1,outreach_attempts:2,gmail_message_id:'<followup-1>',last_follow_up_at:'2026-10-15T07:12:00Z'},client()));
 assert.equal(writes[0]!.body.follow_up_count,undefined);
});
test("duplicate copies of one confirmed receipt do not count as multiple sends",async t=>{
 const receipts=[{message_id:'<f1>',sequence_no:2},{message_id:'<f1>',sequence_no:2}];
 await mockHistory(t,{receipts});assert.ok(await claimFollowUpRetry({...lead,follow_up_count:1,outreach_attempts:2,gmail_message_id:'<f1>',last_follow_up_at:'2026-10-15'},client()));
});
for(const [name,events] of Object.entries({missing:[],smtp:[{outcome:'follow_up_send_failed'}],sent:[...gen,{outcome:'follow_up_sent'}],stale:[{outcome:'stale_follow_up_claim_stopped'}]}))
 test(`no writes when failed-claim proof is ${name}`,async t=>{const writes=await mockHistory(t,{events});await assert.rejects(claimFollowUpRetry(lead,client()),/not confirmed/);assert.equal(writes.length,0)});
test("legacy counters with missing sent history require manual review",async t=>{
 const writes=await mockHistory(t);await assert.rejects(claimFollowUpRetry({...lead,follow_up_count:1,outreach_attempts:2,last_follow_up_at:'2026-10-15'},client()),/counters do not match/);assert.equal(writes.length,0);
});
test("a different latest receipt stops recovery",async t=>{
 const writes=await mockHistory(t,{receipts:[{message_id:'<f1>',sequence_no:2}]});await assert.rejects(claimFollowUpRetry({...lead,follow_up_count:1,outreach_attempts:2,last_follow_up_at:'2026-10-15'},client()),/counters do not match/);assert.equal(writes.length,0);
});
test("reply, opt-out or concurrent retry winning the CAS causes no dispatch",async t=>{
 const writes=await mockHistory(t,{lost:true});assert.equal(await claimFollowUpRetry(lead,client()),null);assert.equal(writes.length,1);
});
test("database history failures do not write or schedule anything",async t=>{
 const writes=await mockHistory(t,{dbError:true});await assert.rejects(claimFollowUpRetry(lead,client()),/history unavailable/);assert.equal(writes.length,0);
});
test("initial-email failure and active sending never use this recovery path",async()=>{
 await assert.rejects(claimFollowUpRetry({...lead,status:'outreach_dispatch_failed',outreach_status:'failed'},client()),/stopped follow-up/);
});

test("ordinary approved unsent retries still work after adding a follow-up action",()=>{
 const row={approval_status:"approved",do_not_contact:false,email:"owner@example.test",outreach_status:"queued",email_preview_status:"approved",outreach_approved_at:"2026-10-01",updated_at:"2026-10-01"};
 const options=retryOptions(row);assert.equal(options.find(x=>x.kind==="outreach")!.allowed,true);assert.equal(options.find(x=>x.kind==="follow_up")!.allowed,false);
});
