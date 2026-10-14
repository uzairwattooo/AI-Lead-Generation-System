import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchAuditHomepage} from '../src/server/audits/homepage-fetch';
const validate=async(value:string)=>{const u=new URL(value);if(u.hostname==='127.0.0.1')throw new Error('PRIVATE_NETWORK_URL_BLOCKED');return u;};
test('redirects resolve relative locations and keep final HTTP metadata',async(t)=>{
 t.mock.method(globalThis,'fetch',async(url:Parameters<typeof fetch>[0])=>String(url).endsWith('/start')?new Response('',{status:301,headers:{location:'/home'}}):new Response('<title>Business</title>',{headers:{'content-type':'text/html'}}));
 const r=await fetchAuditHomepage('https://example.com/start',validate);assert.equal(r.finalUrl,'https://example.com/home');assert.equal(r.response.status,200);assert.equal(r.method,'http');
});
test('redirect loop uses browser fallback with bounded network and returns rendered page',async(t)=>{
 process.env.BROWSERLESS_TOKEN='test-only';let calls=0;
 t.mock.method(globalThis,'fetch',async(url:Parameters<typeof fetch>[0],options?:RequestInit)=>{
  calls++;
  if(String(url).includes('/function')){const body=JSON.parse(String(options?.body));assert.match(body.code,/setRequestInterception/);return Response.json({data:{html:'<title>Real Business</title><body>Business</body>',status:200,finalUrl:'https://www.example.com/'}});}
  return new Response('',{status:302,headers:{location:'https://example.com/'}});
 });
 try{const r=await fetchAuditHomepage('https://example.com/',validate);assert.equal(r.method,'browser');assert.match(r.directError||'',/REDIRECT_LOOP/);assert.equal(calls,2);}finally{delete process.env.BROWSERLESS_TOKEN;}
});
test('403 remains an access failure when browser access also fails',async(t)=>{
 process.env.BROWSERLESS_TOKEN='test-only';
 t.mock.method(globalThis,'fetch',async(url:Parameters<typeof fetch>[0])=>String(url).includes('/function')?Response.json({data:{html:'Access denied',status:403,finalUrl:'https://example.com/'}}):new Response('Denied',{status:403,headers:{'content-type':'text/html'}}));
 try{const r=await fetchAuditHomepage('https://example.com/',validate);assert.equal(r.response.status,403);assert.match(r.directError||'',/BROWSER_ACCESS_BLOCKED/);}finally{delete process.env.BROWSERLESS_TOKEN;}
});
test('unsafe redirects never call browser provider',async(t)=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:302,headers:{location:'http://127.0.0.1/'}});});
 await assert.rejects(fetchAuditHomepage('https://example.com/',validate),/PRIVATE_NETWORK/);assert.equal(calls,1);
});
test('200 bot challenge is not accepted as the homepage',async(t)=>{
 const old=process.env.BROWSERLESS_TOKEN;delete process.env.BROWSERLESS_TOKEN;
 t.mock.method(globalThis,'fetch',async()=>new Response('<title>Just a moment...</title>',{headers:{'content-type':'text/html'}}));
 try{await assert.rejects(fetchAuditHomepage('https://example.com/',validate),/BOT_CHALLENGE/);}finally{if(old)process.env.BROWSERLESS_TOKEN=old;}
});
