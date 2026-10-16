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
  if(path.includes('/screenshot')){const body=JSON.parse(String(options?.body));assert.equal(body.options.fullPage,true);assert.equal(body.scrollPage,true);assert.equal(body.url,'https://example.com/');return new Response(new Uint8Array(before),{headers:{'content-type':'image/png'}});}
  assert.ok(path.endsWith('/images/edits'));assert.ok(options?.body instanceof FormData);assert.equal(options.body.getAll('image[]').length,3);assert.ok(options.body.getAll('image[]').every(image=>image instanceof Blob));assert.match(String(options.body.get('prompt')),/complete homepage/);assert.equal(options.body.get('quality'),'high');
  return Response.json({data:[{b64_json:after.toString('base64')}]});
 };
 try{const result=await captureConcept({companyName:'Example Business',website:'https://example.com/'});assert.equal(result.before.length,before.length);const meta=await sharp(result.comparison).metadata();assert.equal(meta.width,1552);assert.ok((meta.height||0)>1600);const proposal=await sharp(result.after).metadata();assert.equal(proposal.width,1024);assert.equal(proposal.height,Math.round(3200/1440*1024));assert.equal(calls.length,3);}finally{globalThis.fetch=original;delete process.env.OPENAI_API_KEY;delete process.env.BROWSERLESS_TOKEN;}
});
test('search results require a matching public source; inaccessible profiles remain review-only',async(t)=>{
 t.mock.method(dns,'lookup',async()=>[{address:'93.184.216.34',family:4}]);
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test-only';
 const contact={name:'Example owner',role:'Owner',email:'contact@examplebusiness.com',phone:'',sourceUrl:'https://example.com/contact',evidence:'Example business public contact',companyMatch:true};
 globalThis.fetch=async(url)=>String(url).endsWith('/responses')?Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({candidates:[contact,{...contact,sourceUrl:'https://example.com/blocked'}],summary:'Found source'})}]}]}):String(url).includes('/blocked')?new Response('',{status:403}):new Response('Example Business public contact: contact@examplebusiness.com',{headers:{'content-type':'text/html'}});
 try{const result=await findContacts({companyName:'Example Business',website:'https://example.com/',city:'Test City'});assert.equal(result.candidates[0]!.confirmed,true);assert.equal(result.candidates[1]!.confirmed,false);}finally{globalThis.fetch=original;delete process.env.OPENAI_API_KEY;}
});
test('long proposal joins independently generated top, middle and footer panels in source order',async(t)=>{
 t.mock.method(dns,'lookup',async()=>[{address:'93.184.216.34',family:4}]);
 process.env.OPENAI_API_KEY='test-only';process.env.BROWSERLESS_TOKEN='test-only';
 const before=await sharp({create:{width:1024,height:4096,channels:3,background:'#dddddd'}}).png().toBuffer();
 const colors=['#ff0000','#00ff00','#0000ff'];
 const panels=await Promise.all(colors.map(background=>sharp({create:{width:1024,height:1536,channels:3,background}}).png().toBuffer()));
 const captured:number[]=[];
 t.mock.method(globalThis,'fetch',async(url:Parameters<typeof fetch>[0],options?:RequestInit)=>{
  if(String(url).includes('/screenshot'))return new Response(new Uint8Array(before),{headers:{'content-type':'image/png'}});
  const form=options!.body as FormData;const prompt=String(form.get('prompt'));
  const index=Number(prompt.match(/vertical segment (\d+) of 3/)?.[1])-1;assert.ok(index>=0&&index<3);
  const source=form.getAll('image[]')[0] as Blob;const meta=await sharp(Buffer.from(await source.arrayBuffer())).metadata();
  assert.ok(meta.height===1365||meta.height===1366);captured.push(index);
  assert.match(prompt,index===0?/navigation\/header and hero at the TOP/:index===2?/complete footer at the BOTTOM/:/do not add a new navigation/);
  return Response.json({data:[{b64_json:panels[index]!.toString('base64')}]});
 });
 try {
  const result=await captureConcept({companyName:'Example Business',website:'https://example.com/'});
  const meta=await sharp(result.after).metadata();assert.equal(meta.width,1024);assert.equal(meta.height,4096);assert.deepEqual(captured.sort(),[0,1,2]);
  for(const [top,color] of [[1,[255,0,0]],[2048,[0,255,0]],[4094,[0,0,255]]] as const){
   const pixel=await sharp(result.after).extract({left:10,top,width:1,height:1}).removeAlpha().raw().toBuffer();assert.deepEqual([...pixel],color);
  }
 } finally {delete process.env.OPENAI_API_KEY;delete process.env.BROWSERLESS_TOKEN;}
});
test('one failed panel rejects the full proposal instead of returning a partial page',async(t)=>{
 t.mock.method(dns,'lookup',async()=>[{address:'93.184.216.34',family:4}]);
 process.env.OPENAI_API_KEY='test-only';process.env.BROWSERLESS_TOKEN='test-only';
 const before=await sharp({create:{width:1024,height:3200,channels:3,background:'#dddddd'}}).png().toBuffer();
 t.mock.method(globalThis,'fetch',async(url:Parameters<typeof fetch>[0])=>String(url).includes('/screenshot')?new Response(new Uint8Array(before),{headers:{'content-type':'image/png'}}):Response.json({error:'failed'},{status:500}));
 try {await assert.rejects(captureConcept({companyName:'Example Business',website:'https://example.com/'}),/AI provider returned HTTP 500/);}finally{delete process.env.OPENAI_API_KEY;delete process.env.BROWSERLESS_TOKEN;}
});
