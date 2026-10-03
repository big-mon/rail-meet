import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validate,haversine,shortest,restore,recommend} from '../public/engine.mjs';
const data=validate(JSON.parse(fs.readFileSync(new URL('../public/network.json',import.meta.url))));
assert.equal(data.stations.length,563);assert.equal(data.edges.length,702);
assert(Math.abs(haversine([0,0],[1,0])-111.19508)<.001);
const candidates=recommend(data,['千葉','横浜']);
assert.equal(candidates.length,3);assert(candidates[0].max<=candidates[1].max);
for(const c of candidates)for(const r of c.routes){assert.equal(r.stations.at(-1),c.station);assert(Math.abs(r.steps.reduce((s,p)=>s+data.edges[p.edge].km,0)-r.km)<1e-8);}
const baseline={...data,stations:data.stations.slice(0,76),edges:data.edges.slice(0,80)};
const chibaYokohama=restore(baseline,shortest(baseline,'千葉'),'横浜');
assert(chibaYokohama.km>65&&chibaYokohama.km<72);
assert.equal(chibaYokohama.stations.filter(x=>x==='東京').length,1);
const changes=chibaYokohama.steps.flatMap((s,i,all)=>i&&s.line!==all[i-1].line?[s.from]:[]);assert.deepEqual(changes,['東京']);
for(let i=1;i<chibaYokohama.steps.length;i++)assert.equal(chibaYokohama.steps[i-1].to,chibaYokohama.steps[i].from);
assert.deepEqual(restore(data,shortest(data,'千葉'),'千葉'),{km:0,steps:[],stations:['千葉']});
const same=recommend(data,['千葉','千葉']);assert.equal(same[0].station,'千葉');assert.equal(same[0].max,0);
assert.deepEqual(recommend(data,['千葉','横浜','千葉'])[0].routes[0],recommend(data,['千葉','横浜','千葉'])[0].routes[2]);
assert.throws(()=>recommend(data,['対象外','横浜']));assert.throws(()=>recommend(data,['千葉']));
const isolated={...data,stations:[...data.stations,{id:'孤立駅',coords:[140,35]}]};assert.equal(restore(isolated,shortest(isolated,'千葉'),'孤立駅'),null);assert.deepEqual(recommend(isolated,['千葉','孤立駅']),[]);
// Physical crossing, no station connection: the graph must not infer a transfer.
const crossing={stations:['a','b','c','d'].map(id=>({id,coords:[0,0]})),edges:[{a:'a',b:'b',km:2,line:'x',coords:[[-1,0],[1,0]]},{a:'c',b:'d',km:2,line:'y',coords:[[0,-1],[0,1]]}]};
assert.equal(restore(crossing,shortest(crossing,'a'),'d'),null);
const altered=structuredClone(data);altered.edges[0].km+=1;assert.throws(()=>validate(altered));assert.throws(()=>validate({}));
// Each rail edge is a source polyline, not a two-point chord; reverse reconstruction matches.
assert(baseline.edges.every(e=>e.coords.length>2));
const reversed=restore(baseline,shortest(baseline,'横浜'),'千葉');assert(Math.abs(reversed.km-chibaYokohama.km)<1e-8);
assert.deepEqual(reversed.steps[0].coords,[...chibaYokohama.steps.at(-1).coords].reverse());
// Independent Floyd–Warshall oracle exercises the expanded cyclic network.
const names=data.stations.map(s=>s.id), n=names.length, idx=new Map(names.map((s,i)=>[s,i]));
const all=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:Infinity));
for(const e of data.edges){const i=idx.get(e.a),j=idx.get(e.b);all[i][j]=all[j][i]=Math.min(all[i][j],e.km);}
for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)all[i][j]=Math.min(all[i][j],all[i][k]+all[k][j]);
for(let i=0;i<n;i++){const tree=shortest(data,names[i]);for(let j=0;j<n;j++){assert(Number.isFinite(all[i][j]));assert(Math.abs(tree.distances.get(names[j])-all[i][j])<1e-8);}}
const central=restore(baseline,shortest(baseline,'三鷹'),'千葉');
for(const name of ['吉祥寺','中野','新宿','代々木','四ツ谷','御茶ノ水','秋葉原','浅草橋','両国','錦糸町','西船橋','津田沼','幕張','稲毛'])assert(central.stations.includes(name));
assert(central.km>59&&central.km<62);assert(!central.stations.includes('東京'));
assert(restore(data,shortest(data,'渋谷'),'新宿').km<4);
assert(!data.edges.some(e=>[e.a,e.b].includes('神田')&&[e.a,e.b].includes('新日本橋')));
const scenarios=[['千葉','横浜'],['渋谷','千葉'],['新宿','横浜'],['池袋','津田沼'],['三鷹','千葉'],['渋谷','新宿','池袋']];
const scenarioResults=scenarios.map(origins=>{
 const cs=recommend(data,origins);const oracle=names.map((station,j)=>{const ds=origins.map(o=>all[idx.get(o)][j]);return {station,max:Math.max(...ds),spread:Math.max(...ds)-Math.min(...ds),total:ds.reduce((a,b)=>a+b,0)};}).sort((a,b)=>a.max-b.max||a.spread-b.spread||a.total-b.total||a.station.localeCompare(b.station,'ja'));
 assert.deepEqual(cs.map(c=>c.station),oracle.slice(0,3).map(c=>c.station));return {origins,candidates:cs.map(c=>({station:c.station,distances:c.routes.map(r=>r.km)}))};
});
const base=JSON.parse(fs.readFileSync(new URL('../public/basemap.json',import.meta.url)));assert.equal(base.features.length,9);assert(fs.statSync(new URL('../public/basemap.json',import.meta.url)).size<110000);assert(base.features.every(f=>Object.keys(f.properties).join()==='name'));
console.log(JSON.stringify({result:'PASS',allPairsChecked:n*n,scenarioResults,checks:['distance','ranking','path restoration','explicit Tokyo transfer','crossing is not a transfer','same station','duplicate origin','unreachable','invalid input','corrupt data','reverse paths','316969 all-pairs oracle comparisons','six origin scenarios','continuous Chuo-Sobu local path','563-station connected network','small basemap without roads or POIs'],defaultCandidates:candidates.map(c=>({station:c.station,max:c.max,distances:c.routes.map(r=>r.km)})),chibaYokohamaKm:chibaYokohama.km},null,2));
// Expansion contract: every added rail edge is an explicitly named adjacency, entirely inside the legacy extent.
const spec=JSON.parse(fs.readFileSync(new URL('../data-source/corridors.json',import.meta.url)));
const identity=(c,s)=>spec.identityExceptions[`${c.operator}/${c.line}/${s}`]||s;
const pairs=new Set(spec.corridors.flatMap(c=>c.stations.slice(1).map((b,i)=>JSON.stringify([c.operator,c.line,c.label,identity(c,c.stations[i]),identity(c,b)]))));
const [west,south,east,north]=spec.bounds;
for(const e of data.edges.slice(80)){
 assert(pairs.has(JSON.stringify([e.sourceOperator,e.sourceLine,e.line,e.a,e.b])));
 assert(e.coords.every(([x,y])=>x>=west-1e-9&&x<=east+1e-9&&y>=south-1e-9&&y<=north+1e-9));
}
for(const id of ['幕張豊砂','新綱島','新横浜','葛西臨海公園','浅草（つくばエクスプレス）','浅草','早稲田（都電）','早稲田'])assert(data.stations.some(s=>s.id===id));
assert(!data.edges.some(e=>e.a.startsWith('浅草')&&e.b.startsWith('浅草')&&e.a!==e.b));
assert(!data.edges.some(e=>e.a==='早稲田'&&e.b==='早稲田（都電）'||e.b==='早稲田'&&e.a==='早稲田（都電）'));
assert.deepEqual(data.stations.find(s=>s.id==='大塚').aliases,['大塚駅前']);
assert(data.edges.some(e=>e.line==='京成松戸線'&&e.sourceOperator==='新京成電鉄'));
assert(!data.stations.some(s=>['五井','姉ヶ崎','天台','穴川','新桜台'].includes(s.id)));
const coverage=JSON.parse(fs.readFileSync(new URL('../public/coverage.json',import.meta.url)));
assert.equal(coverage.stations,data.stations.length);assert.equal(coverage.edges,data.edges.length);
assert(coverage.projections.every(p=>p.metres<=150));
console.log('PASS original extent, explicit adjacency, new stations, homonyms, aliases and excluded fragments');
