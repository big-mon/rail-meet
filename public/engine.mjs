export function haversine(a,b){
 const rad=Math.PI/180, p=a[1]*rad,q=b[1]*rad;
 return 12742.0176*Math.asin(Math.min(1,Math.sqrt(Math.sin((q-p)/2)**2+Math.cos(p)*Math.cos(q)*Math.sin((b[0]-a[0])*rad/2)**2)));
}
export function validate(data){
 if(!Array.isArray(data?.stations)||!Array.isArray(data?.edges)||!data.stations.length)throw Error('駅データの形式が正しくありません。');
 const ids=new Set(data.stations.map(s=>s.id));
 const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
 if(ids.size!==data.stations.length||data.stations.some(s=>typeof s.id!=='string'||!point(s.coords)))throw Error('駅データを確認できません。');
 for(const e of data.edges){
  if(!ids.has(e.a)||!ids.has(e.b)||e.a===e.b||!Number.isFinite(e.km)||e.km<=0||!Array.isArray(e.coords)||e.coords.length<2||!e.coords.every(point))throw Error('経路データを確認できません。');
  const length=e.coords.slice(1).reduce((s,p,i)=>s+haversine(e.coords[i],p),0);
  if(Math.abs(length-e.km)>0.001)throw Error('経路と距離が一致しません。');
 }
 return data;
}
export function shortest(data,start){
 const graph=new Map(data.stations.map(s=>[s.id,[]]));
 if(!graph.has(start))throw Error('対象駅から選択してください。');
 data.edges.forEach((e,i)=>{graph.get(e.a).push({to:e.b,i});graph.get(e.b).push({to:e.a,i});});
 const distances=new Map([[start,0]]),previous=new Map();
 const order=new Map(data.stations.map((s,i)=>[s.id,i]));
 const heap=[],less=(a,b)=>a[0]<b[0]||(a[0]===b[0]&&order.get(a[1])<order.get(b[1]));
 function push(item){let i=heap.length;heap.push(item);while(i){const p=(i-1)>>1;if(!less(item,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=item;}
 function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&less(heap[c+1],heap[c]))c++;if(!less(heap[c],last))break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;}
 push([0,start]);
 while(heap.length){
  const [d,u]=pop();if(d!==distances.get(u))continue;
  for(const {to,i} of graph.get(u)){
   const next=d+data.edges[i].km;
   if(next<(distances.get(to)??Infinity)){distances.set(to,next);previous.set(to,{from:u,edge:i});push([next,to]);}
  }
 }
 return {distances,previous,start};
}
export function restore(data,tree,target){
 if(!tree.distances.has(target))return null;
 const steps=[];let at=target;
 while(at!==tree.start){const p=tree.previous.get(at);if(!p)throw Error('経路を復元できません。');const e=data.edges[p.edge];steps.unshift({edge:p.edge,from:p.from,to:at,line:e.line,coords:e.a===p.from?e.coords:[...e.coords].reverse()});at=p.from;}
 return {km:tree.distances.get(target),steps,stations:[tree.start,...steps.map(s=>s.to)]};
}
export function recommend(data,origins){
 if(origins.length<2||origins.length>4)throw Error('参加者を2〜4人にしてください。');
 const trees=origins.map(s=>shortest(data,s));
 return data.stations.map(s=>{
  const ds=trees.map(t=>t.distances.get(s.id));if(ds.some(d=>d===undefined))return null;
  return {station:s.id,max:Math.max(...ds),spread:Math.max(...ds)-Math.min(...ds),total:ds.reduce((a,b)=>a+b,0)};
 }).filter(Boolean).sort((a,b)=>a.max-b.max||a.spread-b.spread||a.total-b.total||a.station.localeCompare(b.station,'ja')).slice(0,3).map(c=>({...c,routes:trees.map(t=>restore(data,t,c.station))}));
}
