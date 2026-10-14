import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import sharp from 'sharp';
import {fitStorageImage,storageImageLimit} from '../src/server/lead-tools/storage-image';
test('actual bucket limit is used; absent limit has a conservative fallback',()=>{
 assert.equal(storageImageLimit(1_000_000),1_000_000);
 assert.equal(storageImageLimit('5242880'),4*1024*1024);
 assert.equal(storageImageLimit(null),4*1024*1024);
});
test('small screenshots retain their original bytes',async()=>{
 const input=await sharp({create:{width:80,height:160,channels:3,background:'#f4f5f7'}}).png().toBuffer();
 assert.equal(await fitStorageImage(input,10_000),input);
});
test('oversized noisy full-page PNG is reduced below the upload limit without cropping',async()=>{
 const input=await sharp(randomBytes(800*1600*3),{raw:{width:800,height:1600,channels:3}}).png().toBuffer();
 const result=await fitStorageImage(input,200_000);
 assert.ok(input.length>200_000);assert.ok(result.length<=200_000);
 const meta=await sharp(result).metadata();assert.equal(meta.format,'png');
 assert.ok(Math.abs((meta.height! / meta.width!)-2)<0.01);
});
test('invalid limits fail before upload with an actionable message',async()=>{
 await assert.rejects(fitStorageImage(Buffer.from('invalid'),100),/Increase the bucket/);
});
