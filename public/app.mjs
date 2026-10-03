import {showPortal,cancelPortal} from './portal.mjs';
import {formatKm as km} from './distance.mjs';
import {expeditionReward} from './rewards.mjs';
import {motionPath,pointAt} from './motion.mjs';
import {validate,recommend} from './engine.mjs';
const $=id=>document.getElementById(id), colors=['#2169be','#bf4c1d','#8a45b5','#147b61'],letters=['A','B','C','D'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ll=p=>[p[1],p[0]];
let data,origins=['千葉','横浜'],candidates=[],selected=0,map,overlay,routeBounds,motionLayer,motionFrame;
let hasSearched=false;
// Start both data requests together; background failure never blocks routing.
const basemapReady=fetch('./basemap.json',{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw Error('basemap');return r.json();}).catch(()=>null);
const feedbackAnimations=new Set();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let loopWanted=false,mapOnScreen=false;
reducedMotion.addEventListener('change',()=>{cancelPortal();loopWanted=hasSearched&&!$('results').hidden;syncRailMotion();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelPortal();loopWanted=hasSearched&&!$('results').hidden;}syncRailMotion();});
function renderInputs(){
 $('origins').innerHTML=origins.map((value,i)=>`<div class="origin-field"><label for="origin-${i}"><span class="person-dot" style="--person:${colors[i]}">${letters[i]}</span>参加者 ${letters[i]}</label><div class="select-row"><select id="origin-${i}" ${data?'':'disabled'} aria-label="参加者 ${letters[i]} の出発駅">${(data?.stations||origins.map(id=>({id}))).map(s=>`<option${s.id===value?' selected':''}>${esc(s.id)}</option>`).join('')}</select>${origins.length>2?`<button type="button" class="remove" data-remove="${i}" aria-label="参加者 ${letters[i]} を削除">×</button>`:''}</div></div>`).join('');
 origins.forEach((_,i)=>$(`origin-${i}`).addEventListener('change',e=>{origins[i]=e.target.value;updateOrigins();joinPerson(i);}));
 document.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{origins.splice(Number(b.dataset.remove),1);renderInputs();updateOrigins();$('add').focus({preventScroll:true});}));
 $('add').disabled=!data||origins.length>=4;
}
function updateOrigins(){
 if(hasSearched)calculate();else stopMotion();
}
function calculate(animate=false){
 if(!data||!window.L)return;
 stopMotion();
 try{
  candidates=recommend(data,origins);selected=0;
  if(!candidates.length)throw Error('全員が到達できる集合駅がありません。出発駅を変更してください。');
  $('status').className='';$('status').textContent=new Set(origins).size<origins.length?'同じ出発駅も、別々の参加者として比較しています。':'';
  $('results').hidden=false;
  renderCandidates();document.dispatchEvent(new Event('results-layout'));renderSelection();if(animate)playMotion();else runRailMotion();
 }catch(e){$('results').hidden=true;$('status').textContent=e.message;$('status').className='error';}
}
function renderCandidates(){
 $('candidates').innerHTML=candidates.map((c,i)=>`<button type="button" class="candidate" aria-pressed="${i===selected}" data-candidate="${i}" aria-label="候補${i+1} ${esc(c.station)} 最大距離${km(c.max)}キロメートル"><div class="candidate-top"><span class="rank">距離順 ${i+1}位</span><span class="selected-label">${i===selected?'● 選択中':''}</span></div><h3>${esc(c.station)}</h3><p>最も遠い人 <b>${km(c.max)}</b> km</p><div class="spread">距離の差 ${km(c.spread)} km</div></button>`).join('');
 document.querySelectorAll('[data-candidate]').forEach(b=>b.addEventListener('click',()=>{
  stopMotion();selected=Number(b.dataset.candidate);renderCandidates();renderSelection();document.querySelector(`[data-candidate="${selected}"]`).focus({preventScroll:true});runRailMotion();
 }));
}
function renderSelection(){
 const c=candidates[selected],reward=expeditionReward(c.routes);
 renderReward(reward);
 $('meeting-name').textContent=c.station;
 $('details-title').textContent='遠い人ランキング';
 const ranked=c.routes.map((r,i)=>({r,i,shown:Number(km(r.km))})).sort((a,b)=>b.shown-a.shown||a.i-b.i);
 $('route-details').innerHTML=ranked.map(({r,i,shown})=>{
  const rank=ranked.findIndex(x=>x.shown===shown)+1;
  const lines=[...new Set(r.steps.map(s=>s.line))];
  return `<article class="route-card" data-rank="${rank}" data-person-index="${i}" style="--person:${colors[i]}"><div class="route-row"><span class="distance-rank">${rank}位</span><span class="person-dot">${letters[i]}</span><span>${esc(origins[i])}</span><strong>${km(r.km)} <small>km</small></strong></div>${reward.winners.includes(i)?'<p class="route-award"><img src="crown.svg" alt="" width="20" height="18">遠征の勇者</p>':''}<div class="bar"><span style="width:${c.max?r.km/c.max*100:0}%"></span></div>${r.steps.length?`<details><summary>${lines.map(esc).join(' → ')}<br>経由する駅を見る</summary><p class="stops">${r.stations.map(esc).join(' → ')}</p></details>`:'<p class="zero">集合駅と同じです。移動はありません。</p>'}</article>`;
 }).join('');
 $('legend').innerHTML=origins.map((o,i)=>`<span class="legend-item"><span class="person-dot" style="--person:${colors[i]}">${letters[i]}</span>${esc(o)}<b>${km(c.routes[i].km)} km</b></span>`).join('');
 if(!map)initMap();map.invalidateSize({pan:false});drawRoutes();
}
function initMap(){
 map=L.map('map',{dragging:false,touchZoom:false,doubleClickZoom:false,scrollWheelZoom:false,boxZoom:false,keyboard:false,tapHold:false,zoomAnimation:false,fadeAnimation:false,minZoom:8,maxZoom:17,zoomSnap:.1,zoomControl:false,attributionControl:false});
 L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
 overlay=L.layerGroup().addTo(map);motionLayer=L.layerGroup().addTo(map);
 new IntersectionObserver(entries=>{mapOnScreen=entries[0].isIntersecting;syncRailMotion();}).observe($('map'));
 let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{map.invalidateSize();fitRoutes();},100);}).observe($('map'));
 map.createPane('context');map.getPane('context').style.zIndex=200;map.createPane('contextLabels');map.getPane('contextLabels').style.zIndex=250;
 loadBasemap();
}
async function loadBasemap(){
 let layer;
 $('background-status').parentElement.hidden=false;$('background-status').textContent='都県境を読み込んでいます…';
 try{
  const basemapData=await basemapReady;
  if(basemapData?.type!=='FeatureCollection'||!Array.isArray(basemapData.features)||!basemapData.features.length||basemapData.features.some(f=>f.geometry?.type!=='MultiPolygon'))throw Error('basemap');
  layer=L.layerGroup().addTo(map);
  const fills={'東京都':'#f2f2e9','神奈川県':'#eff1e6','千葉県':'#f0f2e8','埼玉県':'#f3f1e8'};
  L.geoJSON(basemapData,{pane:'context',interactive:false,style:f=>({fillColor:fills[f.properties.name]||'#f0f1e9',fillOpacity:1,color:'#bdc7bd',weight:1.2,smoothFactor:1})}).addTo(layer);
  const labels=[['東京都',35.748,139.58],['神奈川県',35.49,139.46],['千葉県',35.754,140.065],['埼玉県',35.835,139.73],['茨城県',36.01,140.20],['東京湾',35.54,139.92]];
  labels.forEach(([name,lat,lon])=>L.marker([lat,lon],{pane:'contextLabels',interactive:false,keyboard:false,icon:L.divIcon({className:'context-label'+(name==='東京湾'?' sea-label':''),html:esc(name),iconSize:[90,24],iconAnchor:[45,12]})}).addTo(layer));
  $('background-status').textContent='都県境・海岸線の概略図';$('background-status').parentElement.hidden=true;
 }catch{
  if(layer)map.removeLayer(layer);
  $('background-status').textContent='背景を取得できません · 経路は表示中。再読み込みで再試行できます。';
 }
}
function drawRoutes(){
 stopMotion();
 const c=candidates[selected];overlay.clearLayers();const used=new Map(),allPoints=[];
 data.edges.forEach(e=>L.polyline(e.coords.map(ll),{color:'#96a99c',weight:1.7,opacity:.55,interactive:false}).addTo(overlay));
 c.routes.forEach((r,i)=>{r.steps.forEach(s=>{allPoints.push(...s.coords.map(ll));if(!used.has(s.edge))used.set(s.edge,[]);used.get(s.edge).push(i);});allPoints.push(ll(data.stations.find(s=>s.id===origins[i]).coords));});
 for(const [edge,people] of used){
  const points=data.edges[edge].coords.map(ll);
  L.polyline(points,{color:'white',weight:people.length*4+4,opacity:1,interactive:false}).addTo(overlay);
  people.forEach((i,j)=>L.polyline(points,{color:colors[i],weight:(people.length-j)*4,opacity:1,lineCap:'round',interactive:false,className:`person-route person-${i}`}).addTo(overlay));
 }
 const labels=new Set([...origins,c.station]);
 const routeStations=new Set(c.routes.flatMap(r=>r.stations));
 data.stations.forEach(s=>{
  const isDest=s.id===c.station,participants=origins.map((o,i)=>o===s.id?i:-1).filter(i=>i>=0);
  const active=participants.length>0;
  if(!routeStations.has(s.id)&&!labels.has(s.id))return;
  const marker=L.circleMarker(ll(s.coords),{radius:isDest?8:active?6:2.5,color:isDest?'#163e36':active?colors[participants[0]]:'#7c9284',fillColor:isDest?'#c5dd79':'#fff',weight:isDest||active?3:1,fillOpacity:1,interactive:false}).addTo(overlay);
  if(active){
   const description=`出発地 ${s.id}：参加者 ${participants.map(i=>letters[i]).join('・')}`;
   const badgeHTML=participants.map(i=>`<span class="origin-badge" data-origin-person="${letters[i]}" style="--person:${colors[i]}">${letters[i]}</span>`).join('');
   const bubble=`<div class="origin-callout${participants.length>1?' shared-origin':''}" style="--origin-color:${participants.length===1?colors[participants[0]]:'#435e58'}" role="img" aria-label="${esc(description)}"><span class="origin-badges">${badgeHTML}</span><span class="origin-name">${esc(s.id)}</span></div>`;
   L.marker(ll(s.coords),{interactive:false,keyboard:false,zIndexOffset:1000,icon:L.divIcon({className:'origin-marker',html:bubble,iconSize:[0,0],iconAnchor:[0,0]})}).addTo(overlay);
  }
  if(isDest)marker.bindTooltip(esc('★ '+s.id),{permanent:true,direction:'bottom',offset:[8,12],className:'station-name destination-label'});
 });
 allPoints.push(ll(data.stations.find(s=>s.id===c.station).coords));routeBounds=L.latLngBounds(allPoints);
 fitRoutes();
 // Only result/selection/size changes fit the map; animation frames never do.
 $('map').setAttribute('aria-label',`${origins.join('・')}から${c.station}までの鉄道経路。共通区間は色の縞で表示。`);
}
function fitRoutes(){
 if(!routeBounds)return;
 const labels=[...document.querySelectorAll('.origin-callout,.destination-label')].map(e=>e.getBoundingClientRect());
 const halfWidth=Math.max(15,...labels.map(r=>r.width/2));
 const height=Math.max(20,...labels.map(r=>r.height));
 const legend=document.body.classList.contains('showtime')?$('legend').getBoundingClientRect().height:0;
 const zero=candidates[selected].routes.every(r=>r.km===0);
 const options={paddingTopLeft:[halfWidth+8,Math.max(height+21,legend+14)],paddingBottomRight:[halfWidth+8,height+22],maxZoom:zero?15:17,animate:false};
 map.fitBounds(routeBounds,options);
}
async function load(){
 data=undefined;renderInputs();$('find').disabled=true;$('status').className='';$('status').textContent='鉄道データを読み込んでいます…';$('results').hidden=true;$('add').disabled=true;
 try{
  const response=await fetch('./network.json',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('load');data=validate(await response.json());
  if(!window.L)throw Error('map');renderInputs();$('status').textContent='';$('find').disabled=false;
 }catch{
  $('status').className='error';$('status').innerHTML='データを読み込めませんでした。通信状態を確認して再試行してください。<button class="retry" type="button" id="retry">再読み込み</button>';
  $('retry').addEventListener('click',()=>window.L?load():location.reload());
 }
}
$('add').addEventListener('click',()=>{if(origins.length>=4)return;origins.push('東京');renderInputs();updateOrigins();$(`origin-${origins.length-1}`).focus({preventScroll:true});joinPerson(origins.length-1);});
$('find').addEventListener('click',()=>{
 if(!data||$('find').disabled)return;
 const first=!hasSearched;hasSearched=true;calculate(true);
 if(first&&!$('results').hidden)animateFeedback($('results'),[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:260});
 animateFeedback($('find'),[{transform:'scale(1)'},{transform:'scale(.98)'},{transform:'scale(1)'}],{duration:220});
});
load();

function stopMotion(){
 loopWanted=false;cancelPortal();
 cancelAnimationFrame(motionFrame);motionFrame=undefined;
 feedbackAnimations.forEach(a=>a.cancel());feedbackAnimations.clear();
 motionLayer?.clearLayers();
}
function playMotion(){
 stopMotion();
 showPortal(candidates[0].station,runRailMotion,reducedMotion.matches);
}
function runRailMotion(){loopWanted=true;syncRailMotion();}
function syncRailMotion(){
 cancelAnimationFrame(motionFrame);motionFrame=undefined;motionLayer?.clearLayers();
 if(!loopWanted||!mapOnScreen||document.hidden||reducedMotion.matches||!motionLayer||$('results').hidden)return;
 const paths=candidates[selected].routes.map(motionPath);
 const pieces=paths.map((path,i)=>path.total>0?L.marker(ll(pointAt(path,0)),{interactive:false,keyboard:false,zIndexOffset:2000,icon:L.divIcon({className:'travel-marker',html:`<span class="travel-piece" style="--person:${colors[i]};--slot:${i-(origins.length-1)/2}">${letters[i]}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).addTo(motionLayer):null);
 if(!pieces.some(Boolean))return;
 const start=performance.now(),duration=2400,pause=650,arrived=paths.map(()=>false);
 const destination=ll(data.stations.find(s=>s.id===candidates[selected].station).coords);
 let cycle=0;
 function frame(now){
  const elapsed=now-start,nextCycle=Math.floor(elapsed/(duration+pause));
  const progress=Math.min(1,(elapsed%(duration+pause))/duration);
  const goal=map.latLngToContainerPoint(destination);
  const kmPerPixel=map.distance(destination,map.containerPointToLatLng(goal.add([1,0])))/1000;
  pieces.forEach((piece,i)=>{
   if(!piece)return;
   if(nextCycle!==cycle){
    // Reset while hidden, then reveal at the departure point in the same frame.
    piece.setOpacity(0);piece.setLatLng(ll(pointAt(paths[i],0)));arrived[i]=false;
   }
   if(arrived[i])return;
   const position=ll(pointAt(paths[i],progress)),point=map.latLngToContainerPoint(position);
   const offset=(i-(origins.length-1)/2)*21;
   const endpoint=map.latLngToContainerPoint(ll(pointAt(paths[i],1)));
   // The 15px traveller meets the 8px destination circle. Restrict the overlap
   // test to the final route approach, not an earlier nearby rail segment.
   const nearEnd=(1-progress)*paths[i].total<=kmPerPixel*(24+Math.abs(offset)+endpoint.distanceTo(goal));
   const overlaps=Math.hypot(point.x+offset-goal.x,point.y-goal.y)<=24;
   arrived[i]=progress>=1||(nearEnd&&overlaps);
   piece.setLatLng(position);piece.setOpacity(arrived[i]?0:1);
  });
  cycle=nextCycle;
  motionFrame=requestAnimationFrame(frame);
 }
 motionFrame=requestAnimationFrame(frame);
}
function animateFeedback(element,keyframes,options){
 if(reducedMotion.matches||!element)return;
 const a=element.animate(keyframes,{easing:'cubic-bezier(.2,.8,.3,1)',...options});feedbackAnimations.add(a);
 a.onfinish=a.oncancel=()=>feedbackAnimations.delete(a);
}
function joinPerson(i){
 const frames=[{transform:'scale(.65) rotate(-10deg)'},{transform:'scale(1.25) rotate(5deg)',offset:.6},{transform:'scale(1)'}];
 animateFeedback(document.querySelector(`#origin-${i}`).closest('.origin-field').querySelector('.person-dot'),frames,{duration:320});
 animateFeedback(document.querySelector(`[data-origin-person="${letters[i]}"]`),frames,{duration:320});
}

function renderReward(reward){
 const {max,winners}=reward;
 $('reward').innerHTML=winners.length?`<div class="reward-heading"><img class="reward-crown" src="crown.svg" alt="王冠" width="32" height="28"><strong>遠征の勇者</strong><span class="reward-people">${winners.map(i=>`<span class="winner-token"><img class="personal-crown" src="crown.svg" alt="" width="23" height="19"><span class="person-dot" data-winner="${letters[i]}" style="--person:${colors[i]}">${letters[i]}</span></span>`).join('')}</span></div><p class="reward-message">${[...new Set(winners.map(i=>origins[i]))].map(esc).join('・')}からの遠征プランに、拍手！</p><p class="reward-rule">最長 ${km(max)} km${winners.length>1?' · みんなが勇者！':''}</p>`:'<strong class="nearby-party">ご近所パーティー！</strong><p class="reward-message">みんな同じ駅。遠征なしで集まれるね！</p>';
}
