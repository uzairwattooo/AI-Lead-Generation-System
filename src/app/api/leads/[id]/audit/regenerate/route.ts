import { after, NextResponse } from "next/server";

import { apiError, handleRouteError, requireSession } from "@/server/api";
import { runWebsiteAudit } from "@/server/audits/audit-engine";
import { prepareWebsiteDevelopment } from "@/server/outreach/prepare-website-development";
import { websiteMissing } from "@/server/outreach/website-development";
export const maxDuration=300;
import { createSupabaseAdminClient } from "@/server/supabase-admin";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const { id } = await params;
    const admin = createSupabaseAdminClient();
    const {data:current,error:currentError}=await admin.from("lead_pipeline").select("id,website,lead_key,audit_status,updated_at").eq("id",id).maybeSingle();
    if(currentError)throw new Error(currentError.message);
    if(!current)return apiError("Lead not found.",404);
    if(websiteMissing(current.website)){
      const {data:candidate,error:candidateError}=await admin.from("lead_discovery_candidates").select("website,resolved_website").eq("lead_key",current.lead_key).order("updated_at",{ascending:false}).limit(1).maybeSingle();
      if(candidateError)throw new Error(candidateError.message);
      if(websiteMissing(candidate?.website)&&websiteMissing(candidate?.resolved_website)){
        const result=await prepareWebsiteDevelopment(id);
        return NextResponse.json({queued:false,websiteMissing:true,draftReady:result.developmentDraftReady,blockReason:result.blockReason,dispatch:{dispatched:true,detail:result.blockReason||"Website development email is ready in Outreach. Review and approve it before sending."}});
      }
    }
    if(["audit_pending","audit_processing"].includes(current.audit_status)&&Date.now()-Date.parse(current.updated_at)<300000)return NextResponse.json({queued:true,existing:true,dispatch:{dispatched:true,detail:"The website audit is already queued or processing."}},{status:202});
    const { data, error } = await admin
      .from("lead_pipeline")
      .update({
        audit_status: "audit_pending",
        audit_error_code: null,
        audit_error_message: null,
        email_preview_status: null,
        outreach_approved_at: null,
        status: "audit_pending",
        next_action: "run_verified_website_audit",
        next_workflow: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("updated_at",current.updated_at)
      .is("gmail_message_id", null)
      .is("dashboard_deleted_at",null)
      .neq("outreach_status","sending")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Could not queue a fresh audit: ${error.message}`);
    if (!data) return apiError("The lead was not found or has already been sent.", 409);
    after(async()=>{
      try{await runWebsiteAudit(id);}catch(error){await admin.from("lead_pipeline").update({audit_status:"audit_failed",audit_error_code:"AUDIT_WORKER_FAILED",audit_error_message:error instanceof Error?error.message:"Audit worker failed.",updated_at:new Date().toISOString()}).eq("id",id).in("audit_status",["audit_processing","audit_pending"]);}
    });
    return NextResponse.json({queued:true,dispatch:{dispatched:true,detail:"The website audit is queued. Its progress will appear on this lead."}},{status:202});
  } catch (error) {
    return handleRouteError(error);
  }
}
