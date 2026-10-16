import type {ReplyRecord} from "@/types";
import {REPLY_CLASSIFICATIONS} from "@/types";
export function normalizeReplyClassification(value:string):ReplyRecord["classification"]{
 if(value==="unsubscribe")return "do_not_contact";
 return REPLY_CLASSIFICATIONS.includes(value as ReplyRecord["classification"])?value as ReplyRecord["classification"]:"unclear";
}
export function replyMatches(reply:ReplyRecord,tab:string){
 if(tab==="all")return true;
 if(tab==="report")return ["report","report_and_video"].includes(reply.requestedAction||"");
 if(tab==="video")return ["video","report_and_video"].includes(reply.requestedAction||"");
 if(tab==="unsubscribe")return reply.classification==="do_not_contact"||String(reply.classification)==="unsubscribe";
 if(tab==="unhandled")return !reply.handled;
 return reply.classification===tab;
}
