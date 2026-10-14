import test from 'node:test';
import assert from 'node:assert/strict';
import { staleJobReason } from '../src/server/lead-tools/execution-policy';
import { conceptBlockedReason } from '../src/lib/lead-tools-availability';
test('queued worker failure is detected promptly, without expiring a running concept', () => {
 const now=Date.now();
 const job={kind:'contacts',status:'queued',updated_at:new Date(now-61_000).toISOString()};
 assert.match(staleJobReason(job,now)||'',/did not start/);
 assert.equal(staleJobReason({...job,status:'processing'},now),null);
 assert.match(staleJobReason({...job,status:'processing',updated_at:new Date(now-91_000).toISOString()},now)||'',/stopped/);
 assert.equal(staleJobReason({...job,kind:'concept',status:'processing',updated_at:new Date(now-200_000).toISOString()},now),null);
 assert.equal(staleJobReason({...job,status:'completed'},now),null);
});
test('homepage eligibility explains missing data, approval and send locks', () => {
 const lead={website:'https://example.com',pipelineLeadId:'pipeline',approvalStatus:'approved' as const,rawOutreachStatus:'not_started',outreachStatus:'not_queued' as const};
 assert.equal(conceptBlockedReason(lead),null);
 assert.match(conceptBlockedReason({...lead,website:''})||'',/website URL/);
 assert.match(conceptBlockedReason({...lead,approvalStatus:'pending'})||'',/Approve/);
 assert.match(conceptBlockedReason({...lead,pipelineLeadId:null})||'',/Prepare/);
 assert.match(conceptBlockedReason({...lead,rawOutreachStatus:'sending'})||'',/sending/);
 assert.match(conceptBlockedReason({...lead,outreachStatus:'awaiting_reply'})||'',/sending/);
 assert.match(conceptBlockedReason(lead,true)||'',/already running/);
});
