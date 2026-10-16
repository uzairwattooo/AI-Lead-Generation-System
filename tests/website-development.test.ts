import test from "node:test";
import assert from "node:assert/strict";
import { websiteMissing, websiteDevelopmentEmail, developmentOutreachBlock } from "../src/server/outreach/website-development";
import { prepareWebsiteDevelopment } from "../src/server/outreach/prepare-website-development";
import { renderProfessionalEmail } from "../src/server/outreach/email-template";

const lead = {id:"lead",lead_key:"key",company_name:"Halo Salon",city:"Austin",website:null,approval_status:"approved",email:"hello@halosalon.test",email_validation_status:"syntax_valid",outreach_status:"not_started",updated_at:"2026-10-16T00:00:00Z"};
function database(row: Record<string,unknown>, candidate: Record<string,unknown>|null=null, conflict=false){
 const writes: {table:string;operation:string;value:Record<string,unknown>}[]=[];
 const admin={from(table:string){
  let operation="select";
  const query={select(){return query;},eq(){return query;},is(){return query;},neq(){return query;},order(){return query;},limit(){return query;},
   insert(value:Record<string,unknown>){writes.push({table,operation:"insert",value});return Promise.resolve({error:null});},
   update(value:Record<string,unknown>){operation="update";writes.push({table,operation,value});return query;},
   maybeSingle(){return Promise.resolve({data:operation==="update"?(conflict?null:{id:row.id}):table==="lead_pipeline"?row:candidate,error:null});}
  };return query;
 }};
 return {admin:admin as unknown as Parameters<typeof prepareWebsiteDevelopment>[1],writes};
}
test("missing URL differs from malformed, blocked and inaccessible existing URLs",()=>{
 for(const value of [null,undefined,"","  "])assert.equal(websiteMissing(value),true);
 for(const value of ["https://blocked.test","not-a-url","N/A"])assert.equal(websiteMissing(value),false);
});
test("development email asks permission without inventing a website visit, defects or attachments",()=>{
 const copy=websiteDevelopmentEmail("Halo Salon","Austin");
 assert.match(copy.body,/couldn't find an official website in the business details/);
 assert.match(copy.body,/Would you like me to share a few ideas/);
 assert.doesNotMatch(copy.body,/audit|PDF|attached|load time|redesign|visited your website/i);
 const rendered=renderProfessionalEmail({companyName:"Halo Salon",body:copy.body,findings:[]});
 assert.doesNotMatch(rendered.html,/<img|<a |report\.pdf/i);
 assert.match(rendered.plainText,/Code Nativex/);
});
test("missing website prepares an approval-required development draft with no HTTP audit or PDF",async()=>{
 const db=database(lead);
 const result=await prepareWebsiteDevelopment("lead",db.admin);
 assert.equal(result.audit.status,"website_missing");assert.equal(result.audit.reportAvailable,false);
 assert.equal(result.developmentDraftReady,true);assert.equal(result.outreachAllowed,false);
 const saved=db.writes.find(x=>x.operation==="update")!.value;
 assert.equal(saved.outreach_kind,"website_development");assert.equal(saved.email_preview_status,"awaiting_approval");
 assert.equal(saved.outreach_approved_at,null);assert.equal(saved.next_workflow,null);assert.equal(saved.audit_error_code,null);
 assert.equal(saved.audit_report_url,null);assert.deepEqual(saved.audit_findings,[]);
});
test("no email, invalid email, rejection and do-not-contact never produce a sendable draft",async()=>{
 for(const patch of [{email:null},{email:"email@email.com"},{email_validation_status:"invalid"},{approval_status:"rejected"},{do_not_contact:true}]){
  const db=database({...lead,...patch});const result=await prepareWebsiteDevelopment("lead",db.admin);
  assert.equal(result.developmentDraftReady,false);
  assert.equal(db.writes.find(x=>x.operation==="update")!.value.outreach_subject,null);
  assert.ok(developmentOutreachBlock({...lead,...patch}));
 }
});
test("existing website or a website discovered later cannot enter development outreach",async()=>{
 for(const [row,candidate] of [[{...lead,website:"https://blocked.test"},null],[lead,{website:null,resolved_website:"https://found.test"}]] as const){
  const db=database(row,candidate);await assert.rejects(prepareWebsiteDevelopment("lead",db.admin),/website is now available/);assert.equal(db.writes.length,0);
 }
});
test("already-sent/sending leads are untouched and concurrent changes cannot save a stale draft",async()=>{
 for(const patch of [{gmail_message_id:"sent"},{first_outreach_at:"2026-10-16"},{outreach_status:"sending"}]){
  const db=database({...lead,...patch});await assert.rejects(prepareWebsiteDevelopment("lead",db.admin),/already been contacted/);assert.equal(db.writes.length,0);
 }
 const db=database(lead,null,true);await assert.rejects(prepareWebsiteDevelopment("lead",db.admin),/Lead changed/);
});
