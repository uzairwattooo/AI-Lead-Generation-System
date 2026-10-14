import test from 'node:test';
import dns from 'node:dns/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {captureConcept,findContacts} from '../src/server/lead-tools/providers';
test('provider pipeline requests full-page capture, edits the real screenshot and creates a labelled before/after PNG',async(t)=>{
 t.mock.method(dns,'lookup',async()=>[{address:'93.184.216.34',family:4}]);
 const original=globalThis.fetch;
 process.env.OPENAI_API_KEY='test-only';process.env.BROWSERLESS_TOKEN='test-only';
 const before=await sharp({create:{width:1440,height:3200,channels:3,background:'#dedede'}}).png().toBuffer();
 const after=await sharp({create:{width:1024,height:1536,channels:3,background:'#18b3a6'}}).png().toBuffer();
 const calls:string[]=[];
 globalThis.fetch=async(url,options)=>{
  const path=String(url);calls.push(path);
  if(path.includes('/screenshot')){const body=JSON.parse(String(options?.body));assert.equal(body.options.fullPage,true);assert.equal(body.url,'https://example.com/');return new Response(new Uint8Array(before),{headers:{'content-type':'image/png'}});}
  assert.ok(path.endsWith('/images/edits'));assert.ok(options?.body instanceof FormData);assert.ok(options.body.get('image') instanceof Blob);assert.match(String(options.body.get('prompt')),/complete homepage/);
  return Response.json({data:[{b64_json:after.toString('base64')}]});
 };
 try{const result=await captureConcept({companyName:'Example Business',website:'https://example.com/'});assert.equal(result.before.length,before.length);const meta=await sharp(result.comparison).metadata();assert.equal(meta.width,1552);assert.ok((meta.height||0)>1600);assert.equal(calls.length,2);}finally{globalThis.fetch=original;delete process.env.OPENAI_API_KEY;delete process.env.BROWSERLESS_TOKEN;}
});
test('search results require a matching public source; inaccessible profiles remain review-only',async(t)=>{
 t.mock.method(dns,'lookup',async()=>[{address:'93.184.216.34',family:4}]);
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test-only';
 const contact={name:'Example owner',role:'Owner',email:'contact@examplebusiness.com',phone:'',sourceUrl:'https://example.com/contact',evidence:'Example business public contact',companyMatch:true};
 globalThis.fetch=async(url)=>String(url).endsWith('/responses')?Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({candidates:[contact,{...contact,sourceUrl:'https://example.com/blocked'}],summary:'Found source'})}]}]}):String(url).includes('/blocked')?new Response('',{status:403}):new Response('Example Business public contact: contact@examplebusiness.com',{headers:{'content-type':'text/html'}});
 try{const result=await findContacts({companyName:'Example Business',website:'https://example.com/',city:'Test City'});assert.equal(result.candidates[0]!.confirmed,true);assert.equal(result.candidates[1]!.confirmed,false);}finally{globalThis.fetch=original;delete process.env.OPENAI_API_KEY;}
});
