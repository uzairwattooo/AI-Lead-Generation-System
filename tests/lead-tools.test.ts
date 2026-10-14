import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {usableEmail,verifyPublishedContact,contactCandidateSchema,conceptEmail} from "../src/server/lead-tools/policy";
const contact={name:"Owner",role:"Owner",email:"info@realbusiness.com",phone:"+12125551234",sourceUrl:"https://realbusiness.com/contact",evidence:"Real Business contact details",companyMatch:true};
test("contact search rejects placeholders, guesses, unrelated and non-HTTP sources",()=>{
 assert.equal(usableEmail("email@email.com"),false);
 assert.equal(usableEmail("info@realbusiness.com"),true);
 assert.equal(verifyPublishedContact(contact,"info@realbusiness.com +1 212 555 1234"),true);
 assert.equal(verifyPublishedContact(contact,"info@realbusiness.com phone unavailable"),false);
 assert.equal(verifyPublishedContact({...contact,companyMatch:false},"info@realbusiness.com +1 212 555 1234"),false);
 assert.equal(contactCandidateSchema.safeParse({...contact,sourceUrl:"javascript:alert(1)"}).success,false);
});
test("concept email describes an attached proposal without claiming implementation, results or an audit",()=>{
 const email=conceptEmail("Example Dental");assert.match(email.body,/attached image/);assert.match(email.body,/visual proposal/);assert.doesNotMatch(email.body,/guarantee|\d+%|audit report|calendly|completed your website/i);
});
test("notification uses dashboard recipient and records confirmed acceptance independently from client send",()=>{
 const w=JSON.parse(readFileSync("n8n/03-Personalized-Email-Outreach.json","utf8"));
 const node=w.nodes.find((n:{name:string})=>n.name==="Return Outreach Completion");
 const context={leadId:"lead",sendKey:"send"};const prepared={shouldNotify:true,adminEmail:"admin@example.com",saved:true,status:"awaiting_reply"};
 const run=(input:unknown)=>vm.runInNewContext(`(function(){${node.parameters.jsCode}})()`,{$json:input,$:(name:string)=>({item:{json:name==="Build Admin Send Notification"?prepared:context}})}).json;
 assert.equal(run({accepted:["admin@example.com"],messageId:"admin-id"}).adminNotificationStatus,"sent");
 assert.equal(run({error:{message:"SMTP failed"}}).adminNotificationStatus,"failed");
 assert.equal(run({accepted:["someone@example.com"],messageId:"id"}).adminNotificationStatus,"failed");
 const build=w.nodes.find((n:{name:string})=>n.name==="Build Admin Send Notification");assert.match(build.parameters.jsCode,/context.adminNotificationEmail/);
 assert.equal(w.connections['Return Outreach Completion'].main[0][0].node,'Persist Admin Notification Receipt');
});
test("image attachment has its own gated branch; ordinary first-touch remains attachment-free",()=>{
 const w=JSON.parse(readFileSync("n8n/03-Personalized-Email-Outreach.json","utf8"));
 assert.equal(w.nodes.find((n:{name:string})=>n.name==="SMTP Send First Touch").parameters.options.attachments,undefined);
 assert.equal(w.nodes.find((n:{name:string})=>n.name==="SMTP Send Homepage Concept").parameters.options.attachments,"data");
 assert.equal(w.connections['Concept Binary Ready?'].main[1][0].node,'Build SMTP Send Result');
 for(const file of ["n8n/03-Personalized-Email-Outreach.json","n8n/06-Contact-Research-and-Homepage-Concepts.json"]){
 const workflow=JSON.parse(readFileSync(file,"utf8"));const names=new Set(workflow.nodes.map((n:{name:string})=>n.name));
 for(const n of workflow.nodes)if(n.type==="n8n-nodes-base.code")new vm.Script(`(function(){${n.parameters.jsCode}})`);
 for(const [source,connection] of Object.entries(workflow.connections)){assert.ok(names.has(source));for(const branch of (connection as {main:Array<Array<{node:string}>>}).main)for(const edge of branch)assert.ok(names.has(edge.node));}
 }
});
