import test from "node:test";
import assert from "node:assert/strict";
import {planConceptSegments} from "../src/server/lead-tools/concept-layout";

test("the supplied 472 by 2048 homepage gets a full-height three-part proposal",()=>{
 const parts=planConceptSegments(472,2048);
 assert.equal(parts.length,3);
 assert.equal(parts.reduce((n,p)=>n+p.height,0),2048);
 assert.equal(parts.reduce((n,p)=>n+p.outputHeight,0),4443);
 assert.equal(parts[0]!.top,0);
 const last=parts.at(-1)!;assert.equal(last.top+last.height,2048);
 for(let i=1;i<parts.length;i++){
  assert.equal(parts[i]!.top,parts[i-1]!.top+parts[i-1]!.height);
  assert.equal(parts[i]!.outputTop,parts[i-1]!.outputTop+parts[i-1]!.outputHeight);
 }
});
test("ordinary short pages need only one generation; long pages are bounded without silently truncating",()=>{
 assert.equal(planConceptSegments(1440,1440).length,1);
 assert.throws(()=>planConceptSegments(1024,10000),/too long.*No partial concept/);
 assert.throws(()=>planConceptSegments(0,100),/Invalid/);
});
