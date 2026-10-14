import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAuditOutreachSafety} from '../src/server/audits/audit-safety';
const input={websiteIdentityVerified:false,websiteIdentityConfidence:0,homepageFetched:false,analyzedUrlValid:true,auditConfidence:0,confidenceThreshold:70,findings:[],email:'info@business.test',emailValidationStatus:'syntax_valid',doNotContact:false,duplicateCount:0,leadStatus:'approved',approvalStatus:'approved'};
test('fetch failure is not mislabeled as invalid URL or stale identity',()=>{
 const result=evaluateAuditOutreachSafety({...input,homepageError:'fetch failed'});assert.equal(result.code,'WEBSITE_FETCH_FAILED');
});
test('403 and rate limit are audit-access failures, not claims of website defects',()=>{
 for(const error of ['HTTP_403','HTTP_429'])assert.equal(evaluateAuditOutreachSafety({...input,homepageError:error}).code,'AUDIT_ACCESS_BLOCKED');
});
test('no findings still prevents unsupported audit-based outreach',()=>{
 assert.equal(evaluateAuditOutreachSafety({...input,websiteIdentityVerified:true,websiteIdentityConfidence:95,homepageFetched:true,auditConfidence:95}).code,'NO_VERIFIED_FINDINGS');
});
