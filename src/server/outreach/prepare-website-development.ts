import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { renderProfessionalEmail } from "./email-template";
import { websiteMissing, websiteDevelopmentEmail, developmentOutreachBlock } from "./website-development";
import type { WebsiteAudit } from "@/types";

export async function prepareWebsiteDevelopment(leadId: string, admin = createSupabaseAdminClient()) {
  const {data:lead,error}=await admin.from("lead_pipeline").select("*").eq("id",leadId).maybeSingle();
  if(error)throw new Error(error.message);if(!lead)throw new Error("Lead not found.");
  if(lead.gmail_message_id || lead.first_outreach_at || lead.outreach_status === "sending" || lead.dashboard_deleted_at)throw new Error("This lead has already been contacted, is sending, or was deleted.");
  const {data:candidate,error:candidateError}=await admin.from("lead_discovery_candidates").select("resolved_website,website").eq("lead_key",lead.lead_key).order("updated_at",{ascending:false}).limit(1).maybeSingle();
  if(candidateError)throw new Error(candidateError.message);
  if(!websiteMissing(lead.website)||!websiteMissing(candidate?.resolved_website)||!websiteMissing(candidate?.website))throw new Error("A website is now available. Run the website audit instead.");
  const now=new Date().toISOString();const auditId=randomUUID();
  const block=developmentOutreachBlock(lead);
  const firstName=lead.decision_maker_status==="verified"?String(lead.contact_name||"").trim().split(/\s+/)[0]:null;
  const copy=websiteDevelopmentEmail(lead.company_name,lead.city,firstName);
  const rendered=renderProfessionalEmail({companyName:lead.company_name,body:copy.body,findings:[]});
  const scores={performanceMobile:null,performanceDesktop:null,seo:null,accessibility:null,bestPractices:null};
  const audit:WebsiteAudit={id:auditId,leadId,status:"website_missing",auditedUrl:null,finalUrl:null,httpStatus:null,hasHttps:null,score:null,confidence:null,scores,findings:[],evidence:{website_missing:true,reason:"No official website URL is saved; no technical audit was attempted."},screenshotUrl:null,reportFilename:null,reportAvailable:false,generatedAt:now,errorCode:null,errorMessage:null};
  const {error:auditError}=await admin.from("website_audits").insert({id:auditId,lead_id:leadId,status:"website_missing",audit_score:null,confidence:null,scores,findings:[],evidence:audit.evidence,generated_at:now,completed_at:now});
  if(auditError)throw new Error(`Could not save website-missing status: ${auditError.message}`);
  const common={audit_id:auditId,audit_status:"website_missing",audit_score:null,audit_confidence:null,audit_findings:[],audit_evidence:audit.evidence,audit_report_url:null,audit_report_filename:null,audit_generated_at:now,audit_error_code:null,audit_error_message:null,website_screenshot_url:null,outreach_kind:"website_development",outreach_include_concept:false,outreach_approved_at:null,human_review_required:true,next_workflow:null,next_follow_up_at:null,updated_at:now};
  const patch=block?{...common,outreach_subject:null,outreach_body:null,outreach_plain_text_body:null,outreach_html_body:null,email_preview_status:"blocked",outreach_status:"blocked",status:"website_missing",next_action:"manual_review",last_outreach_error:block}:{...common,outreach_subject:copy.subject,outreach_body:rendered.plainText,outreach_plain_text_body:rendered.plainText,outreach_html_body:rendered.html,email_preview_status:"awaiting_approval",outreach_status:"awaiting_approval",status:"email_draft_ready",next_action:"review_email",last_outreach_error:null};
  // Do not overwrite a newer approval/contact/send decision while preparing.
  const {data:saved,error:saveError}=await admin.from("lead_pipeline").update(patch).eq("id",leadId).eq("updated_at",lead.updated_at).is("gmail_message_id",null).neq("outreach_status","sending").is("dashboard_deleted_at",null).select("id").maybeSingle();
  if(saveError)throw new Error(saveError.message);if(!saved)throw new Error("Lead changed while preparing; refresh before retrying.");
  return {leadId,companyName:lead.company_name,audit,outreachAllowed:false,nextWorkflow:null,developmentDraftReady:!block,blockReason:block};
}
