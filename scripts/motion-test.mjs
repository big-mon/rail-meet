import assert from 'node:assert/strict';
import fs from 'node:fs';
import {recommend} from '../dist/engine.mjs';
import {motionPath,pointAt} from '../dist/motion.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../dist/network.json',import.meta.url)));
for(const origins of [['千葉','横浜'],['千葉','千葉'],['三鷹','千葉','渋谷','横浜']]){
 for(const c of recommend(data,origins))for(const route of c.routes){
  const path=motionPath(route);assert(Math.abs(path.total-route.km)<.001);
  if(!path.total){assert.equal(pointAt(path,.5),null);continue;}
  assert.deepEqual(pointAt(path,0),route.steps[0].coords[0]);
  const end=pointAt(path,1);route.steps.at(-1).coords.at(-1).forEach((n,i)=>assert(Math.abs(n-end[i])<1e-10));
  for(let i=0;i<=100;i++){const p=pointAt(path,i/100);assert(path.segments.some(s=>{const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1];return Math.abs((p[0]-s.a[0])*dy-(p[1]-s.a[1])*dx)<1e-12&&p[0]>=Math.min(s.a[0],s.b[0])-1e-10&&p[0]<=Math.max(s.a[0],s.b[0])+1e-10&&p[1]>=Math.min(s.a[1],s.b[1])-1e-10&&p[1]<=Math.max(s.a[1],s.b[1])+1e-10;}));}
 }
}
// Disconnected input shape is never joined by an invented animation segment.
const gap=motionPath({steps:[{coords:[[0,0],[0,1]]},{coords:[[5,5],[5,6]]}]});assert.equal(gap.segments.length,2);assert(pointAt(gap,.6)[0]===5);
console.log('PASS: animation samples follow restored rail segments, endpoints and zero-distance routes; no gap bridging');
