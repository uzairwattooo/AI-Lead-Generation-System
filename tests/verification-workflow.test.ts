import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('./00c-classifier.txt',import.meta.url),'utf8');
function run(candidate:object,html:string,status=200){const $=()=>({first:()=>({json:candidate})});return new Function('$','$json',script)($,{statusCode:status,body:html})[0].json;}
test('00C saves verified only with matching brand and location evidence',()=>{
 const r=run({company_name:'Austin Dentistry',city:'Austin',probe_url:'https://austindentistry.com/',website_identity_confidence:100},'<title>Austin Dentistry</title><body>Austin Dentistry Austin, TX</body>');
 assert.equal(r.verification_status_next,'verified');assert.ok(r.identity_confidence_next>=70);
});
test('00C confidence 100 cannot rescue an unrelated or email-provider site',()=>{
 for(const url of ['https://att.net/','https://outfit.com/']){
 const r=run({company_name:'Miami Clutch & Transmission',city:'Miami',probe_url:url,website_identity_confidence:100},'<title>News and Email</title><body>Latest Miami news and email portal. Welcome.</body>');assert.notEqual(r.verification_status_next,'verified');}
});
test('00C challenge response is not verified even when it returns 200',()=>{
 const r=run({company_name:'Austin Dentistry',city:'Austin',probe_url:'https://austindentistry.com/',website_identity_confidence:100},'<title>Just a moment</title><body>Austin Dentistry Austin</body>');assert.notEqual(r.verification_status_next,'verified');
});
