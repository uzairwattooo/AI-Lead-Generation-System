import { NextResponse } from "next/server";
import { requireSession,handleRouteError } from "@/server/api";
import { downloadConcept } from "@/server/lead-tools/concept-download";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const session=await requireSession();if(!session.ok)return session.response;
 try {const {id}=await params;const kind=new URL(request.url).searchParams.get("kind")||"comparison";const data=await downloadConcept(id,kind);return new NextResponse(data.bytes,{headers:{"content-type":"image/png","cache-control":"private, no-store","content-disposition":'inline; filename="homepage-concept.png"'}});}catch(error){return handleRouteError(error);}
}
