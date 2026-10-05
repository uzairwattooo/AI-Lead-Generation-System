import {createHmac,timingSafeEqual} from "node:crypto";
export function validCalendlySignature(raw:string,header:string,key:string,now=Date.now()):boolean{
 const fields=header.split(",").map(s=>s.trim().split("="));
 const timestamp=fields.find(([k])=>k==="t")?.[1]??"";
 if(!key||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>180)return false;
 const expected=createHmac("sha256",key).update(`${timestamp}.${raw}`).digest();
 return fields.filter(([k])=>k==="v1").some(([,value])=>{if(!value||!/^[a-f0-9]{64}$/i.test(value))return false;const supplied=Buffer.from(value,"hex");return supplied.length===expected.length&&timingSafeEqual(supplied,expected);});
}
