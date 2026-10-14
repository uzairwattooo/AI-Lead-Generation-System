import test from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import {findContacts} from '../src/server/lead-tools/providers';
test('unrelated company contacts are excluded rather than offered to apply',async(t)=>{
 process.env.OPENAI_API_KEY='test-only';
 t.mock.method(dns,'lookup',async()=>[{address:'93.184.216.34',family:4}]);
 t.mock.method(globalThis,'fetch',async(url:Parameters<typeof fetch>[0])=>String(url).endsWith('/responses')?Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({candidates:[{name:'Erin',role:'Owner',email:'hello@other.test',phone:'',sourceUrl:'https://other.test/about',evidence:'Other Business Seattle public contact',companyMatch:true}]})}]}]}):new Response('Other Business Seattle hello@other.test',{headers:{'content-type':'text/html'}}));
 try{const result=await findContacts({companyName:'Developing ai chatbot',city:'Bay Minette'});assert.equal(result.candidates.length,0);}finally{delete process.env.OPENAI_API_KEY;}
});
