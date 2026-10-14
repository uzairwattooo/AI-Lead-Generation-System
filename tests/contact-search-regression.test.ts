import test from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import {findContacts} from '../src/server/lead-tools/providers';
test('completed empty search reports no public contact instead of timeout',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({output:[{type:'message',content:[{type:'output_text',text:'{"candidates":[],"summary":""}'}]}]}));
 process.env.OPENAI_API_KEY='test-only';
 try {const result=await findContacts({companyName:'Example Business'});assert.deepEqual(result.candidates,[]);assert.match(result.summary,/No public contact found/);}finally{delete process.env.OPENAI_API_KEY;}
});
test('source verification runs concurrently',async(t)=>{
 t.mock.method(dns,'lookup',async()=>[{address:'93.184.216.34',family:4}]);
 process.env.OPENAI_API_KEY='test-only';
 const contact={name:'',role:'',email:'hello@business.test',phone:'',sourceUrl:'https://example.com/contact',evidence:'Published business email address',companyMatch:true};
 let sourceCalls=0; let release!:()=>void;
 const bothStarted=new Promise<void>(resolve=>{release=resolve;});
 t.mock.method(globalThis,'fetch',async(url: Parameters<typeof fetch>[0],options?: RequestInit)=>{
  if(String(url).endsWith('/responses')) {const body=JSON.parse(String(options?.body));assert.equal(body.max_tool_calls,2);return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({candidates:[contact,{...contact,sourceUrl:'https://example.com/about'}]})}]}]});}
  sourceCalls++;if(sourceCalls===2)release();await bothStarted;
  return new Response('Example Business hello@business.test',{headers:{'content-type':'text/html'}});
 });
 try {const result=await findContacts({companyName:'Example Business',website:'https://example.com'});assert.equal(sourceCalls,2);assert.ok(result.candidates.every(c=>c.confirmed));}finally{delete process.env.OPENAI_API_KEY;}
});
