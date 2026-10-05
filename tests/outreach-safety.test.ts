import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {createHmac} from "node:crypto";
import {validateEvidenceDraft} from "../src/server/outreach/draft-safety";
import {buildEvidenceEmailPrompt,renderProfessionalEmail} from "../src/server/outreach/email-template";
import {requestedReplyAction,followUpDate} from "../src/server/outreach/reply-policy";
const findings=[
 {code:"MISSING_TITLE",title:"Missing homepage title",priority:"high" as const,evidence:"Empty title.",impact:"Weaker snippet.",recommendation:"Add title."},
 {code:"NO_CONTACT_CTA",title:"No clear contact CTA",priority:"high" as const,evidence:"No contact CTA detected.",impact:"Enquiry friction.",recommendation:"Add CTA."},
];
const body="Hello Example Dental team,\n\nI took a quick look at your public website. The homepage title is empty, and no clear contact CTA was detected. These points may make it harder for visitors to understand the page and start an enquiry. I can share a short breakdown of practical fixes. Would you like me to send it over? No cost or obligation.";
test("first-touch offers the breakdown without attachment or meeting CTA",()=>{
 assert.deepEqual(validateEvidenceDraft({subject:"Quick note on Example Dental's website",body,findingCodes:findings.map(f=>f.code),verifiedFindings:findings}),[]);
 const email=renderProfessionalEmail({companyName:"Example Dental",body,findings,reportFilename:"report.pdf"});
 assert.doesNotMatch(email.html,/report\.pdf|calendly|attached|snapshot|<img/i);
 assert.match(email.plainText,/Would you like me to send it over/);
 assert.match(email.plainText,/Best regards,\nCode Nativex/);
});
test("old attached drafts, invented results and unsupported measurements are blocked",()=>{
 for(const extra of ["The report is attached.","Book a 15-minute call.","Our client gained 40% more enquiries.","It takes 6 seconds to load."]){
  assert.ok(validateEvidenceDraft({subject:"Quick note on Example website",body:body+" "+extra,findingCodes:findings.map(f=>f.code),verifiedFindings:findings}).length);
 }
});
test("reply routing sends report first, video to booking, and respects stop",()=>{
 assert.equal(requestedReplyAction("Yes please send it","interested",false),"report");
 assert.equal(requestedReplyAction("Please send the audit report","information_request",true),"report");
 assert.equal(requestedReplyAction("Can you send a two minute video?","information_request",false),"booking");
 assert.equal(requestedReplyAction("Sounds good","interested",true),"booking");
 assert.equal(requestedReplyAction("No thanks, not interested","not_interested",false),"none");
 assert.equal(requestedReplyAction("How much does it cost?","pricing_question",false),"none");
});
test("followups use day 3, 7 and 14 measured from first touch",()=>{
 const start="2026-10-02T12:00:00.000Z";
 assert.equal(followUpDate(start,0),"2026-10-04T12:00:00.000Z");
 assert.equal(followUpDate(start,1),"2026-10-08T12:00:00.000Z");
 assert.equal(followUpDate(start,2),"2026-10-15T12:00:00.000Z");
 assert.equal(followUpDate(start,3),null);
});
type N={name:string;parameters:{jsCode?:string;options?:Record<string,unknown>}};
const workflow=(file:string)=>JSON.parse(readFileSync(`n8n/${file}`,"utf8")) as {nodes:N[];connections:Record<string,unknown>};
test("all exported code nodes compile and all connected node names exist",()=>{
 for(const f of ["03-Personalized-Email-Outreach-FIXED.json","03-Personalized-Evidence-Based-Email-Outreach.json","04-Reply-Monitoring-Follow-Up-FIXED.json","05-Meeting-Booking-Sales-Handoff-FIXED.json"]){
  const w=workflow(f),names=new Set(w.nodes.map(n=>n.name));
  for(const n of w.nodes)if(n.parameters.jsCode)new vm.Script(`(function(){${n.parameters.jsCode}\n})`);
  for(const [name,groups] of Object.entries(w.connections)){
   assert.ok(names.has(name));
   for(const edges of Object.values(groups as Record<string,Array<Array<{node:string}>>>))for(const edge of edges.flat())assert.ok(names.has(edge.node),edge.node);
  }
 }
});
test("PDF is exclusive to requested-report reply; Gmail sends do not auto retry",()=>{
 const first=workflow("03-Personalized-Evidence-Based-Email-Outreach.json");
 assert.ok(!first.nodes.some(n=>n.name==="Get PDF as Binary Data"));
 assert.equal(first.nodes.find(n=>n.name==="Gmail Send First Touch")?.parameters.options?.attachmentsUi,undefined);
 const meeting=workflow("05-Meeting-Booking-Sales-Handoff-FIXED.json");
 assert.ok(meeting.nodes.find(n=>n.name==="Send Requested Report")?.parameters.options?.attachmentsUi);
 assert.equal(meeting.nodes.find(n=>n.name==="Send Google Meet Booking Link")?.parameters.options?.attachmentsUi,undefined);
});
test("n8n reply parser handles video/report/rejection without changing contact identity",()=>{
 const w=workflow("04-Reply-Monitoring-Follow-Up-FIXED.json");
 const code=w.nodes.find(n=>n.name==="Parse and Route Reply")!.parameters.jsCode!;
 for(const [reply,intent,status] of [["Send a video please","information_request","meeting_requested"],["Please share the report","information_request","report_requested"],["Not interested","not_interested","not_interested"]]){
  const base={id:"lead",company_name:"Example",email:"person@company.com",incoming_reply:{reply_text:reply,incoming_message_id:"reply",gmail_thread_id:"thread"}};
  const actual=vm.runInNewContext(`(function(){${code}})()`,{$json:{output:JSON.stringify({intent,confidence:95,human_review_required:false})},$:()=>({all:()=>[{json:base}]}),$runIndex:0,$itemIndex:0});
  assert.equal(actual.json.final_status,status);assert.equal(actual.json.next_follow_up_at,null);
 }
});
test("email prompt requests actual identity and permission instead of a call",()=>{
 const prompt=buildEvidenceEmailPrompt({companyName:"Example",contactFirstName:"Ali",website:"https://business.test",service:"Website Redesign",findings});
 assert.match(prompt,/Hello Ali,/);assert.match(prompt,/Do not include a booking link/);assert.match(prompt,/Would you like me to send it over/);
});
import {validCalendlySignature} from "../src/server/meetings/calendly-signature";
test("Calendly signatures reject tampered, expired and unsigned bookings",()=>{
 const body='{"event":"invitee.created"}',key="unit-test-only",time=1800000000;
 const sig=createHmac("sha256",key).update(`${time}.${body}`).digest("hex");
 assert.equal(validCalendlySignature(body,`t=${time},v1=${sig}`,key,time*1000),true);
 assert.equal(validCalendlySignature(body+" ",`t=${time},v1=${sig}`,key,time*1000),false);
 assert.equal(validCalendlySignature(body,`t=${time},v1=${sig}`,key,(time+181)*1000),false);
 assert.equal(validCalendlySignature(body,"",key,time*1000),false);
});
