import "server-only";
import { createSupabaseAdminClient } from "@/server/supabase-admin";
import { serverEnv } from "@/server/env";
export async function downloadConcept(id:string,kind="comparison") {
 const admin=createSupabaseAdminClient();const {data:lead,error}=await admin.from("lead_pipeline").select("visual_concept_path,visual_before_path,visual_after_path,visual_concept_job_id").eq("id",id).maybeSingle();if(error)throw new Error(error.message);
 const path=kind==="before"?lead?.visual_before_path:kind==="after"?lead?.visual_after_path:lead?.visual_concept_path;if(!path)throw new Error("No homepage concept is available.");
 const {data,error:downloadError}=await admin.storage.from(serverEnv.auditStorageBucket).download(path);if(downloadError)throw new Error(downloadError.message);
 return {bytes:await data.arrayBuffer(),jobId:lead?.visual_concept_job_id};
}
