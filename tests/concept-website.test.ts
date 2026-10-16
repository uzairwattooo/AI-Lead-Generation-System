import test from "node:test";
import assert from "node:assert/strict";
import {sameConceptWebsite} from "../src/server/lead-tools/concept-website";

test("completed homepage concepts survive www and canonical URL formatting differences",()=>{
 assert.equal(sameConceptWebsite("https://austindentistry.com/","https://www.austindentistry.com/"),true);
 assert.equal(sameConceptWebsite("https://WWW.AUSTINDENTISTRY.COM","https://austindentistry.com/"),true);
});
test("concepts for different sites, pages, ports or protocols remain blocked",()=>{
 for(const value of ["https://other.test/","https://other.austindentistry.com/","https://austindentistry.com/other","https://austindentistry.com/?page=other","https://austindentistry.com/#other","https://austindentistry.com:444/","http://austindentistry.com/","https://austindentistry.com.evil.test/"]){
  assert.equal(sameConceptWebsite("https://austindentistry.com/",value),false,value);
 }
});
test("invalid, missing and credential-bearing concept targets remain blocked",()=>{
 for(const value of [null,undefined,"",{},"not-a-url","javascript:alert(1)","https://user:secret@austindentistry.com/"]){
  assert.equal(sameConceptWebsite(value,"https://austindentistry.com/"),false);
  assert.equal(sameConceptWebsite("https://austindentistry.com/",value),false);
 }
});
