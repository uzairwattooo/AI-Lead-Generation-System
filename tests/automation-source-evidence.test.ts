import assert from 'node:assert/strict';
import { test } from 'node:test';
import { officialUrl, readOfficialPage, verifyOfficialEvidence } from '../src/lib/automation/source-evidence';
const input = {company_name:'Aurora Store', category:'Online stores & social sellers',city:'Islamabad',country:'Pakistan',website:'https://aurora.example',source_url:'https://aurora.example/',excerpt:'A paraphrased model summary with a citation, not a literal quote.',email:null};
const page = {url:input.website,html:'<h1>Aurora Store</h1><p>Islamabad, Pakistan</p><p>Add to cart</p><p>Contact us for shipping and delivery.</p><a href="mailto:support@aurora.example">Email support</a>'};
test('actual official evidence replaces AI summary without inventing contact',()=>{
 const r=verifyOfficialEvidence(input,[page]);assert.equal(r.verified,true);assert.equal(r.email,'support@aurora.example');assert.ok(r.score>0);assert.notEqual(r.excerpt,input.excerpt);
});
test('same-domain contact page supplies email separately from storefront evidence',()=>{
 const r=verifyOfficialEvidence(input,[{...page,html:page.html.replace('mailto:support@aurora.example','/contact-us/')},{url:'https://aurora.example/contact-us/',html:'<h1>Aurora Store</h1><p>Contact us, Islamabad Pakistan. support@aurora.example</p>'}]);assert.equal(r.email,'support@aurora.example');assert.match(r.source_url,/contact-us/);
});
test('blocked page never verifies AI-claimed email',()=>{
 const r=verifyOfficialEvidence({...input,email:'support@aurora.example'},[{...page,html:'<h1>One moment</h1><p>Please wait while your request is being verified...</p>'}]);assert.equal(r.verified,false);assert.equal(r.email,null);
});
test('unpublished address is not inferred from domain',()=>{
 const r=verifyOfficialEvidence({...input,email:'sales@aurora.example'},[{...page,html:page.html.replace('mailto:support@aurora.example','/contact')}]);assert.equal(r.email,null);
});
test('external footer address is not selected',()=>{
 const r=verifyOfficialEvidence(input,[{...page,html:page.html.replace('support@aurora.example','developer@agency.example')}]);assert.equal(r.email,null);
});
test('hidden script contact is ignored',()=>{
 const r=verifyOfficialEvidence(input,[{...page,html:page.html.replace('mailto:support@aurora.example','/contact')+'<script>support@aurora.example</script><div hidden>sales@aurora.example</div>'}]);assert.equal(r.email,null);
});
test('wrong business identity stays unverified',()=>{const r=verifyOfficialEvidence(input,[{...page,html:page.html.replace('Aurora Store','Different Shop')}]);assert.equal(r.verified,false);});
test('wrong requested city stays unverified',()=>{const r=verifyOfficialEvidence(input,[{...page,html:page.html.replace('Islamabad','Lahore')}]);assert.equal(r.verified,false);assert.match(r.reason,/city/);});
test('store needs actual sales and enquiry evidence',()=>{const r=verifyOfficialEvidence(input,[{...page,html:page.html.replace('Add to cart','About us')}]);assert.equal(r.verified,false);});
test('cross-domain evidence is ignored',()=>{assert.equal(verifyOfficialEvidence(input,[{...page,url:'https://different.example/'}]).verified,false);});
test('unsafe, social and off-domain URLs are rejected',()=>{
 for(const url of ['https://evil.example/contact','http://aurora.example/contact','https://user:pass@aurora.example/','https://aurora.example:444/contact','javascript:alert(1)'])assert.equal(officialUrl(url,input.website),null);
 assert.equal(officialUrl('https://facebook.com/company','https://facebook.com'),null);
 assert.equal(officialUrl('/contact-us/?utm_source=test#x',input.website),'https://aurora.example/contact-us/');
});
test('DOM block boundaries and entity email are handled',()=>{
 const r=verifyOfficialEvidence(input,[{...page,html:'<h1>Aurora Store</h1><div>Islamabad Pakistan</div><p>Add to cart</p><div>Contact us</div><p>support&#64;aurora.example</p>'}]);assert.equal(r.email,'support@aurora.example');
});
test('no-reply contacts are not selected',()=>{const r=verifyOfficialEvidence(input,[{...page,html:page.html.replace('support@aurora.example','noreply@aurora.example')}]);assert.equal(r.email,null);});
test('contact links stay on the official domain',()=>{
 const p=readOfficialPage({...page,html:page.html+'<a href="https://evil.example/contact">Help</a><a href="/contact-us/">Contact</a>'},input.website);assert.ok(p?.contactLinks.includes('https://aurora.example/contact-us/'));assert.ok(!p?.contactLinks.some(u=>u.includes('evil.example')));
});
test('official policy and wholesale pages can supply a published business email',()=>{
 const store={...page,html:page.html.replace('mailto:support@aurora.example','/contact')+'<a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/wholesale">Wholesale</a>'};
 const parsed=readOfficialPage(store,input.website);assert.ok(parsed?.contactLinks.includes('https://aurora.example/privacy'));
 const result=verifyOfficialEvidence(input,[store,{url:'https://aurora.example/wholesale',html:'<h1>Aurora Store</h1><p>For business inquiries email info@aurora.example. Islamabad, Pakistan.</p>'}]);assert.equal(result.email,'info@aurora.example');
});
test('intellectual-property boilerplate is not a real-estate opportunity signal',()=>{
 const result=verifyOfficialEvidence(input,[{...page,html:page.html+'<p>Our intellectual-property framework protects our products.</p>'}]);assert.ok(!result.signals.some(s=>s.label==='Property enquiries'));
});
