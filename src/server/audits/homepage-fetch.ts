export type PublicUrlValidator=(value:string)=>Promise<URL>;
export type FetchedHomepage={response:Response;body:string;finalUrl:string;bytes:number;method:'http'|'browser';directError?:string};
const LIMIT=5_000_000;
async function readLimited(response:Response):Promise<string>{
 const reader=response.body?.getReader();if(!reader)return '';
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT)throw new Error('HOMEPAGE_TOO_LARGE_TO_AUDIT');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks).toString('utf8');
}
export async function fetchAuditHomepage(value:string,validate:PublicUrlValidator):Promise<FetchedHomepage>{
 const initial=(await validate(value)).toString();let current=initial;const seen=new Set<string>();let directError='';let last:FetchedHomepage|undefined;
 const signal=AbortSignal.timeout(30_000);
 try{
  for(let hop=0;hop<10;hop++){
   if(seen.has(current))throw new Error('REDIRECT_LOOP');seen.add(current);
   const response=await fetch(current,{redirect:'manual',signal,headers:{accept:'text/html,application/xhtml+xml','user-agent':'Mozilla/5.0 (compatible; CodeNativeXWebsiteAudit/1.0)'},cache:'no-store'});
   if([301,302,303,307,308].includes(response.status)){
    const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new Error('REDIRECT_WITHOUT_LOCATION');
    current=(await validate(new URL(location,current).toString())).toString();continue;
   }
   const body=await readLimited(response);last={response,body,finalUrl:current,bytes:Buffer.byteLength(body),method:'http'};
   if(response.ok&&/text\/html|application\/xhtml/i.test(response.headers.get('content-type')||'')&&!isChallenge(body))return last;
   directError=isChallenge(body)?'BOT_CHALLENGE':response.ok?'NON_HTML_HOMEPAGE':`HTTP_${response.status}`;break;
  }
  if(!directError)directError='TOO_MANY_REDIRECTS';
 }catch(error){directError=error instanceof Error?error.message:'WEBSITE_FETCH_FAILED';if(['PRIVATE_NETWORK_URL_BLOCKED','INVALID_AUDIT_URL'].includes(directError))throw error;}
 const token=process.env.BROWSERLESS_TOKEN;
 if(!token){if(last&&!last.response.ok)return last;throw new Error(directError);}
 try{
  const endpoint=new URL(process.env.BROWSERLESS_FUNCTION_URL||process.env.BROWSERLESS_SCREENSHOT_URL||'https://production-sfo.browserless.io/function');
  if(!process.env.BROWSERLESS_FUNCTION_URL)endpoint.pathname=endpoint.pathname.replace(/\/screenshot\/?$/,'/function');
  endpoint.searchParams.set('token',token);
  // Permit only the validated site's host and its www variant in this fallback.
  // External resources are unnecessary for extracting rendered HTML and are blocked.
  const code=`export default async ({page,context})=>{
    const allowed=new URL(context.url).hostname.toLowerCase().replace(/^www\\./,'');
    await page.setRequestInterception(true);
    page.on('request',request=>{try{const u=new URL(request.url());const h=u.hostname.toLowerCase().replace(/^www\\./,'');
      if(['http:','https:'].includes(u.protocol)&&h===allowed&&!u.username&&!u.password)request.continue();else request.abort();}catch{request.abort();}});
    const response=await page.goto(context.url,{waitUntil:'domcontentloaded',timeout:45000});
    const html=await page.content();if(html.length>5000000)throw new Error('HOMEPAGE_TOO_LARGE_TO_AUDIT');
    return {data:{html,finalUrl:page.url(),status:response?.status()||0},type:'application/json'};
  }`;
  const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(60_000),body:JSON.stringify({code,context:{url:initial}})});
  if(!r.ok)throw new Error(`BROWSER_PROVIDER_HTTP_${r.status}`);
  const raw=JSON.parse(await readLimited(r));const data=raw.data??raw;
  if(typeof data.html!=='string'||typeof data.finalUrl!=='string')throw new Error('INVALID_BROWSER_RESPONSE');
  const final=(await validate(data.finalUrl)).toString();
  const allowedHost=new URL(initial).hostname.replace(/^www\./,'');
  if(new URL(final).hostname.replace(/^www\./,'')!==allowedHost)throw new Error('BROWSER_CROSS_DOMAIN_REDIRECT');
  const status=Number(data.status);if(!Number.isInteger(status)||status<200||status>=400||isChallenge(data.html))throw new Error(`BROWSER_ACCESS_BLOCKED_${status||'UNKNOWN'}`);
  return {response:new Response(data.html,{status,headers:{'content-type':'text/html'}}),body:data.html,finalUrl:final,bytes:Buffer.byteLength(data.html),method:'browser',directError};
 }catch(error){const reason=error instanceof Error?error.message:'BROWSER_FETCH_FAILED';if(last&&!last.response.ok)return {...last,directError:`${directError}; ${reason}`};throw new Error(`${directError}; ${reason}`);}
}
export function isChallenge(html:string):boolean {
 const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').trim();
 return /^(just a moment|access denied|attention required|request blocked|verify you are human|robot check)/i.test(title);
}
