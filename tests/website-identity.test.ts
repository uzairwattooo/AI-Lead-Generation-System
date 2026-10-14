import test from 'node:test';
import assert from 'node:assert/strict';
import {assessWebsiteIdentity,nonBusinessWebsite} from '../src/server/audits/website-identity';
test('fresh matching business title, official brand domain and city can verify identity',()=>{
 const result=assessWebsiteIdentity({companyName:'Austin Dentistry',city:'Austin'}, {fetched:true,finalUrl:'https://www.austindentistry.com/',title:'Austin Dentistry',headings:[],text:'Welcome to Austin Dentistry in Austin, TX.'});
 assert.equal(result.verified,true);assert.ok(result.confidence>=70);
});
test('a branch can match its brand with corroborating phone evidence',()=>{
 const result=assessWebsiteIdentity({companyName:'Enamel Dentistry Parmer Park',city:'Austin',phone:'+1 512 555 1234'}, {fetched:true,finalUrl:'https://enameldentistry.com/',title:'Enamel Dentistry',text:'Enamel Dentistry Austin call (512) 555-1234'});
 assert.equal(result.verified,true);
});
test('mail-provider domains cannot be treated as business sites',()=>{
 assert.ok(nonBusinessWebsite('https://att.net/'));
 assert.ok(nonBusinessWebsite('https://currently.att.yahoo.com/'));
 assert.equal(assessWebsiteIdentity({companyName:'Miami Clutch & Transmission',city:'Miami'},{fetched:true,finalUrl:'https://att.net/',title:'Miami Clutch & Transmission',text:'Miami Clutch & Transmission Miami'}).verified,false);
});
test('an unrelated business, matching city only, or an unavailable page stays unverified',()=>{
 const target={companyName:'Ross Auto Body Shop LLC',city:'Miami'};
 assert.equal(assessWebsiteIdentity(target,{fetched:true,finalUrl:'https://outfit.com/',title:'Outfit Design',text:'Outfit Design Miami'}).verified,false);
 assert.equal(assessWebsiteIdentity(target,{fetched:false,finalUrl:'https://rossautobody.com/',title:'Ross Auto Body Shop',text:'Miami'}).verified,false);
});
test('shared corporate brand needs evidence of the actual lead; a confidence number is not enough',()=>{
 assert.equal(assessWebsiteIdentity({companyName:'Hughes Supply',city:'Orlando'},{fetched:true,finalUrl:'https://www.hajoca.com/',title:'Hajoca',text:'Hajoca plumbing supply group'}).verified,false);
});
