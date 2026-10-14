import "server-only";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { serverEnv } from "@/server/env";
import { findContacts, captureConcept } from "./providers";
import { fitStorageImage, storageImageLimit } from "./storage-image";

export async function runLeadToolJob(id: string) {
  const admin=createSupabaseAdminClient(); const now=()=>new Date().toISOString();
  const {data:job,error}=await admin.from("codenativex_lead_tool_jobs").update({status:"processing",updated_at:now()}).eq("id",id).eq("status","queued").select("*").maybeSingle();
  if(error) throw new Error(error.message); if(!job) return {claimed:false};
  try {
    const pipeline=await admin.from("lead_pipeline").select("id,approval_status,dashboard_deleted_at,gmail_message_id").eq("id",job.lead_id).maybeSingle();
    const candidate=await admin.from("lead_discovery_candidates").select("id,review_status,dashboard_deleted_at").eq("id",job.lead_id).maybeSingle();
    if(pipeline.error || candidate.error) throw new Error("Could not verify the lead before running the job.");
    if(pipeline.data?.dashboard_deleted_at || candidate.data?.dashboard_deleted_at || (!pipeline.data&&!candidate.data)) throw new Error("Lead has been removed.");
    if(job.kind==="contacts") {
      const result=await findContacts(job.target);
      const {error:saveError}=await admin.from("codenativex_lead_tool_jobs").update({status:result.candidates.length?"completed":"needs_review",result,error_message:result.candidates.length?null:"No public contact found. Lead remains available for manual review.",updated_at:now()}).eq("id",id).eq("status","processing");
      if(saveError) throw new Error(saveError.message);
    } else {
      if(!pipeline.data) throw new Error("Prepare this approved lead for outreach first.");
      const images=await captureConcept(job.target);
      const {data:bucket}=await admin.storage.getBucket(serverEnv.auditStorageBucket);
      const imageLimit=storageImageLimit(bucket?.file_size_limit);
      const paths:Record<string,string>={};
      for(const [name,buffer] of Object.entries(images)) {
        const uploadImage=await fitStorageImage(buffer,imageLimit);
        const path=`${job.lead_id}/concepts/${id}-${name}.png`;
        const {error:uploadError}=await admin.storage.from(serverEnv.auditStorageBucket).upload(path,uploadImage,{contentType:"image/png",upsert:false});
        if(uploadError) throw new Error(uploadError.message); paths[name]=path;
      }
      // Generating another concept always revokes approval of an older draft.
      const {data:saved,error:saveError}=await admin.from("lead_pipeline").update({visual_concept_path:paths.comparison,visual_before_path:paths.before,visual_after_path:paths.after,visual_concept_job_id:id,outreach_include_concept:false,outreach_approved_at:null,email_preview_status:null,outreach_status:"not_started",next_workflow:null,updated_at:now()}).eq("id",job.lead_id).eq("approval_status","approved").is("gmail_message_id",null).is("dashboard_deleted_at",null).neq("outreach_status","sending").select("id").maybeSingle();
      if(saveError) throw new Error(saveError.message); if(!saved) throw new Error("Lead changed while generating; the concept was not attached or approved.");
      const {error:resultError}=await admin.from("codenativex_lead_tool_jobs").update({status:"completed",result:{...paths,description:"Full-page capture and AI design concept. Review image before preparing email."},updated_at:now()}).eq("id",id).eq("status","processing");
      if(resultError) throw new Error(resultError.message);
    }
    return {claimed:true,jobId:id};
  } catch(error) {
    const message=error instanceof Error && ["TimeoutError","AbortError"].includes(error.name) ? "The provider did not respond in time. The task could not complete; this is not a no-result response." : error instanceof Error?error.message:"Lead tool failed.";
    const {error:saveError}=await admin.from("codenativex_lead_tool_jobs").update({status:"failed",error_message:message,updated_at:now()}).eq("id",id).eq("status","processing");
    if(saveError) throw new Error(saveError.message); return {claimed:true,jobId:id,failed:true,error:message};
  }
}
