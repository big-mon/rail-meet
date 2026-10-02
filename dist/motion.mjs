import {haversine} from './engine.mjs';
// Each segment is from the restored rail geometry. Never bridge gaps between steps.
export function motionPath(route){
 const segments=[];let total=0;
 for(const step of route.steps)for(let i=1;i<step.coords.length;i++){
  const a=step.coords[i-1],b=step.coords[i],length=haversine(a,b);
  if(length){segments.push({a,b,start:total,end:total+length});total+=length;}
 }
 return {segments,total};
}
export function pointAt(path,progress){
 if(!path.segments.length)return null;
 const distance=Math.max(0,Math.min(1,progress))*path.total;
 const s=path.segments.find(s=>s.end>=distance)||path.segments.at(-1);
 const t=(distance-s.start)/(s.end-s.start);
 return s.a.map((v,i)=>v+(s.b[i]-v)*t);
}
