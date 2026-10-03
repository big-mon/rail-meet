import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createApi} from '../public/api.mjs';
import {recommend} from '../public/engine.mjs';
import {readShare,shareUrl} from '../public/share.mjs';
const data=JSON.parse(readFileSync('public/network.json'));const base='https://app.damonge.com/rail-meet/api/v1/';
let clock=0;const api=createApi(data,{now:()=>clock});
const req=(path,body,headers={})=>new Request(base+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
let r=await api(req('stations'));assert.equal(r.status,200);assert.equal((await r.json()).count,563);
r=await api(req('stations?q='+encodeURIComponent('千')));assert((await r.json()).stations.every(s=>s.id.includes('千')));
for(const q of ['?q=a&q=b','?x=a','?q='+ 'a'.repeat(41)])assert.equal((await api(req('stations'+q))).status,400);
assert.equal((await api(req('recommendations'))).status,405);assert.equal((await api(req('unknown'))).status,404);
r=await api(new Request(base+'recommendations',{method:'OPTIONS'}));assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*');
for(const origins of [['千葉','横浜'],['千葉','千葉'],['渋谷','横浜','千葉','千葉']]){
 r=await api(req('recommendations',{origins}));assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');const result=await r.json();assert.deepEqual(result.candidates,recommend(data,origins));assert(!('shareUrl' in result.candidates[0]));
 r=await api(req('recommendations',{origins,share:true}));const shared=await r.json();for(const c of shared.candidates){assert.deepEqual(readShare(new URL(c.shareUrl).hash,data),{origins,station:c.station});assert.equal(new URL(c.shareUrl).search,'');}
}
for(const origins of [[],['千葉'],Array(5).fill('千葉'),['千葉駅','横浜'],['千','横浜'],[null,'横浜']]){r=await api(req('recommendations',{origins}));assert.equal(r.status,400);}
clock+=60000;
for(const body of ['{',null,[],{origins:['千葉','横浜'],extra:true},{origins:['千葉','横浜'],share:'true'}])assert.equal((await api(req('recommendations',JSON.stringify(body)))).status,400);
assert.equal((await api(req('recommendations','{}',{'Content-Type':'text/plain'}))).status,415);
assert.equal((await api(req('recommendations','{}',{'Content-Encoding':'gzip'}))).status,415);
assert.equal((await api(req('recommendations',' '.repeat(1025)))).status,413);
assert.equal((await api(req('recommendations','{}',{'Content-Length':'1025'}))).status,413);
const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(800));c.enqueue(new Uint8Array(800));c.close();}});
r=await api(new Request(base+'recommendations',{method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'}));assert.equal(r.status,413);
const isolated=structuredClone(data);isolated.stations.push({id:'孤立駅',coords:[140,35]});assert.equal((await createApi(isolated)(req('recommendations',{origins:['千葉','孤立駅']}))).status,422);
clock+=60000;
for(let i=0;i<30;i++)assert.equal((await api(req('stations'))).status,200);
r=await api(req('stations'));assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'60');clock+=60000;assert.equal((await api(req('stations'))).status,200);
const globalApi=createApi(data);for(let i=0;i<300;i++)assert.equal((await globalApi(new Request(base+'stations',{headers:{'CF-Connecting-IP':String(i)}}))).status,200);assert.equal((await globalApi(req('stations'))).status,429);
assert.equal(readShare('#credits',data),null);
for(const hash of ['#v=2&from=千葉&from=横浜&to=錦糸町','#v=1&from=千葉&from=横浜&to=錦糸町&to=亀戸','#v=1&from=千葉&from=横浜&to=未知'])assert.throws(()=>readShare(hash,data));
assert.equal(shareUrl(['千葉','横浜'],'錦糸町').split('#')[0],'https://app.damonge.com/rail-meet/');
const start=performance.now();for(let i=0;i<100;i++)recommend(data,['千葉','横浜','三鷹','池袋']);console.log(`PASS API validation, same engine results, geometry, sharing, CORS, limits, 429/reset; mean four-person calculation ${(performance.now()-start)/100} ms (Node, not Workers CPU billing)`);
const aliasApi=createApi(data);
const aliasResponse=await aliasApi(req('stations?q='+encodeURIComponent('大塚駅前')));
assert.equal(aliasResponse.status,200);const aliasBody=await aliasResponse.json();assert.equal(aliasBody.stations[0].id,'大塚');assert.deepEqual(aliasBody.stations[0].aliases,['大塚駅前']);
const homonyms=await (await aliasApi(req('stations?q='+encodeURIComponent('浅草')))).json();assert(homonyms.stations.some(s=>s.id==='浅草（つくばエクスプレス）'));assert(homonyms.stations.some(s=>s.id==='浅草'));
console.log('PASS API alias lookup and separate homonymous station IDs');
