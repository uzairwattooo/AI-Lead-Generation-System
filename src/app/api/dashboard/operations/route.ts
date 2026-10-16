import {NextResponse} from "next/server";
import {z} from "zod";
import {apiError,handleRouteError,requireSession} from "@/server/api";
import {createSupabaseAdminClient} from "@/server/supabase-admin";
import {isDemoMode,serverEnv} from "@/server/env";
import {costEstimate} from "@/server/operations/policy";
const rate=z.number().finite().min(0).max(10000).nullable();
export async function GET(){
 const auth=await requireSession();if(!auth.ok)return auth.response;
 if(isDemoMode())return apiError("Operations shows live database data only. Disable demo mode to use it.",409);
 try{const {data,error}=await createSupabaseAdminClient().rpc("codenativex_dashboard_live_summary");if(error)throw new Error(`Apply the dashboard operations migration: ${error.message}`);
  return NextResponse.json({...data,estimate:costEstimate(data.usage,data.rates),notificationEmail:serverEnv.adminNotificationEmail||null});
 }catch(e){return handleRouteError(e);}
}
export async function PATCH(request:Request){
 const auth=await requireSession();if(!auth.ok)return auth.response;
 if(isDemoMode())return apiError("Cost settings are available in live mode only.",409);
 try{const body=z.object({audit_usd:rate,contacts_usd:rate,concept_usd:rate}).strict().safeParse(await request.json());if(!body.success)return apiError("Enter a non-negative USD estimate or leave a rate empty.",422);
  const {error}=await createSupabaseAdminClient().from("codenativex_dashboard_cost_rates").upsert({id:"default",...body.data,updated_at:new Date().toISOString()});if(error)throw new Error(error.message);
  return NextResponse.json({saved:true});
 }catch(e){return handleRouteError(e);}
}
