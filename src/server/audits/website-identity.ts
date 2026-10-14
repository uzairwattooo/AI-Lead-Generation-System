export type IdentityTarget = {companyName:string; city?:string|null; phone?:string|null; address?:string|null};
export type IdentityPage = {fetched:boolean; finalUrl:string; title?:string|null; headings?:string[]; text:string};
const fold=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ignored=new Set(['the','and','of','at','in','llc','inc','ltd','pllc','store','services','service','company','co']);
const generic=new Set(['dental','dentistry','dentist','plumbing','family','supply','supplies','orthodontics','repair','auto','shop','tires','airport','center','centre']);
export function nonBusinessWebsite(value:string):boolean {
 try {const h=new URL(value).hostname.toLowerCase().replace(/^www\./,'');return ['att.net','gmail.com','outlook.com','hotmail.com','live.com','yahoo.com','yahoo.net','currently.att.yahoo.com','google.com','facebook.com','instagram.com','linkedin.com','yelp.com','yellowpages.com','mapquest.com','manta.com','healthgrades.com','zocdoc.com','npiprofile.com','npi-lookup.org','carecredit.com'].some(d=>h===d||h.endsWith('.'+d));}catch{return true;}
}
export function assessWebsiteIdentity(target:IdentityTarget,page:IdentityPage) {
 const empty={verified:false,confidence:0,nameCoverage:0,phoneMatch:false,cityMatch:false,addressMatch:false,blockedDomain:nonBusinessWebsite(page.finalUrl)};
 if(!page.fetched||empty.blockedDomain)return empty;
 const tokens=[...new Set(fold(target.companyName).split(' ').filter(t=>t.length>=3&&!ignored.has(t)))];
 if(!tokens.length)return empty;
 const heading=fold([page.title,...page.headings||[]].join(' '));const words=new Set(heading.split(' '));
 const content=fold(page.text);const host=new URL(page.finalUrl).hostname.replace(/^www\./,'').split('.')[0]||'';
 const hits=tokens.filter(t=>words.has(t));const coverage=hits.length/tokens.length;
 const distinct=tokens.filter(t=>!generic.has(t)&&!fold(target.city||'').split(' ').includes(t));
 const brandMatch=distinct.some(t=>words.has(t)&&host.includes(t));
 const exactName=heading.includes(fold(target.companyName.replace(/\s+-\s+.*$/,'')));
 const city=fold(target.city||'');const cityMatch=city.length>=3&&new RegExp(`(?:^| )${city}(?: |$)`).test(content);
 const digits=(target.phone||'').replace(/\D/g,'');const tail=digits.length>=10?digits.slice(-10):'';
 const phoneMatch=Boolean(tail&&new RegExp(tail.split('').join('[^0-9]{0,4}')).test(page.text));
 const address=fold(target.address||'');const addressMatch=address.length>=12&&/\d/.test(address)&&content.includes(address);
 // Search confidence and email-domain matches are never sufficient identity evidence.
 const verified=coverage>=0.5&&(brandMatch||exactName)&&(phoneMatch||addressMatch||cityMatch&&(exactName||coverage>=0.75));
 return {verified,confidence:verified?(phoneMatch||addressMatch?95:85):Math.min(65,Math.round(coverage*45+(brandMatch?10:0)+(cityMatch?10:0))),nameCoverage:coverage,phoneMatch,cityMatch,addressMatch,blockedDomain:false};
}
