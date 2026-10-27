import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bulkBlockReason,runOpportunityBatch,MAX_BULK_OPPORTUNITIES,type BulkOpportunity,type BulkAction,type BulkResult} from '../src/lib/automation/bulk-opportunities';
const row=(id='one',patch:Partial<BulkOpportunity>={}):BulkOpportunity=>({id,company_name:'Store '+id,kind:'business',review_status:'pending',do_not_contact:false,source_verified:true,email:'support@store.example',signals:[{label:'Online sales enquiries'}],...patch});
test('verified business with published contact and evidence can be bulk approved',()=>assert.equal(bulkBlockReason(row(),'approve_verified'),null));
test('unverified, missing/malformed email and missing evidence cannot be bulk approved',()=>{
 for(const patch of [{source_verified:false},{email:null},{email:'invalid'},{signals:[]}])assert.ok(bulkBlockReason(row('one',patch),'approve_verified'));
});
test('rejected, opted-out and public requests cannot be changed by either bulk action',()=>{
 for(const patch of [{review_status:'rejected'},{do_not_contact:true},{kind:'buyer_request'}])for(const action of ['approve_verified','recheck_source'] as BulkAction[])assert.ok(bulkBlockReason(row('one',patch),action));
});
test('already approved is skipped during approval and already verified is skipped during recheck',()=>{
 assert.match(bulkBlockReason(row('one',{review_status:'approved'}),'approve_verified')||'',/Already approved/);assert.ok(bulkBlockReason(row(),'recheck_source'));
});
test('approved business missing contact can still be rechecked',()=>assert.equal(bulkBlockReason(row('one',{review_status:'approved',email:null}),'recheck_source'),null));
test('batch executes one request at a time and only for selected unique IDs',async()=>{
 let inflight=0,max=0;const called:string[]=[];const visible:BulkResult[]=[];
 const results=await runOpportunityBatch({rows:[row('one'),row('two'),row('one')],action:'approve_verified',shouldStop:()=>false,onStart:()=>{},onResult:r=>visible.push(r),execute:async(id,action)=>{assert.equal(action,'approve_verified');inflight++;max=Math.max(max,inflight);await Promise.resolve();called.push(id);inflight--;return {};}});
 assert.deepEqual(called,['one','two']);assert.equal(max,1);assert.equal(results.length,2);assert.equal(visible.length,2);
});
test('partial failure retains successful results and continues remaining businesses',async()=>{
 const results=await runOpportunityBatch({rows:[row('one'),row('two'),row('three')],action:'approve_verified',shouldStop:()=>false,onStart:()=>{},onResult:()=>{},execute:async id=>{if(id==='two')throw Error('Source changed');return {message:'Approved'};}});
 assert.deepEqual(results.map(r=>r.status),['success','failed','success']);assert.equal(results[1]?.message,'Source changed');
});
test('ineligible businesses receive individual skipped reasons without API calls',async()=>{
 let calls=0;const results=await runOpportunityBatch({rows:[row('one',{do_not_contact:true}),row('two',{email:null})],action:'approve_verified',shouldStop:()=>false,onStart:()=>{},onResult:()=>{},execute:async()=>{calls++;return {};}});
 assert.equal(calls,0);assert.ok(results.every(r=>r.status==='skipped'));assert.match(results[0]?.message||'',/do not contact/);
});
test('unconfirmed rechecks are needs-review results, not successful verification',async()=>{
 const results=await runOpportunityBatch({rows:[row('one',{email:null})],action:'recheck_source',shouldStop:()=>false,onStart:()=>{},onResult:()=>{},execute:async()=>({verified:true,emailFound:false,message:'No published email'})});
 assert.equal(results[0]?.status,'review');
});
test('stop after current preserves its result and does not start the next request',async()=>{
 let stop=false,calls=0;const results=await runOpportunityBatch({rows:[row('one'),row('two')],action:'approve_verified',shouldStop:()=>stop,onStart:()=>{},onResult:()=>{},execute:async()=>{calls++;stop=true;return {};}});
 assert.equal(calls,1);assert.equal(results.length,1);
});
test('cancelling before start makes no requests',async()=>{
 const results=await runOpportunityBatch({rows:[row()],action:'approve_verified',shouldStop:()=>true,onStart:()=>assert.fail('must not start'),onResult:()=>{},execute:async()=>assert.fail('must not execute')});assert.equal(results.length,0);
});
test('selection cap rejects oversized batches before any request',async()=>{
 await assert.rejects(runOpportunityBatch({rows:Array.from({length:MAX_BULK_OPPORTUNITIES+1},(_,i)=>row(String(i))),action:'approve_verified',shouldStop:()=>false,onStart:()=>{},onResult:()=>{},execute:async()=>assert.fail('must not execute')}),/up to 50/);
});
