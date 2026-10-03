let overlay,timers=[],animations=[];
export function cancelPortal(){timers.forEach(clearTimeout);timers=[];animations.forEach(a=>a.cancel());animations=[];overlay?.remove();overlay=undefined;}
export function showPortal(candidates,selected,onReveal,reduced){
 cancelPortal();
 const root=document.createElement('div');overlay=root;root.className='mouth-portal';root.dataset.phase=reduced?'result':'face';root.setAttribute('aria-label','集合駅の発表');
 root.innerHTML='<div class="portal-camera"><div class="portal-face"><img class="portal-smile" src="hero-smile.png" alt=""><img class="portal-mouth" src="hero-mouth.png" alt=""></div></div><div class="portal-caption" aria-hidden="true">集合場所は…！</div><div class="portal-result" role="status"><small>集合はここ！</small><strong></strong><div class="portal-options"></div></div><button type="button" class="portal-skip" aria-label="演出を閉じる">閉じる ×</button>';
 root.querySelector('.portal-result strong').textContent=candidates[selected].station+'駅';
 candidates.forEach((c,i)=>{const item=document.createElement('span');item.className=i===selected?'chosen':'';item.textContent=`${i+1}. ${c.station}  ${c.max.toFixed(1)} km`;root.querySelector('.portal-options').append(item);});
 document.body.append(root);
 let revealed=false,started=false;const startRoutes=()=>{if(!started){started=true;onReveal();}};
 const reveal=()=>{if(revealed)return;revealed=true;root.dataset.phase='result';};
 root.querySelector('button').onclick=()=>{cancelPortal();startRoutes();};
 const later=(fn,ms)=>timers.push(setTimeout(fn,ms));
 if(reduced){reveal();startRoutes();later(cancelPortal,1700);return;}
 const animate=(el,frames,options)=>{const a=el.animate(frames,{fill:'forwards',easing:'cubic-bezier(.3,.0,.2,1)',...options});animations.push(a);};
 animate(root.querySelector('.portal-mouth'),[{opacity:0},{opacity:1}],{delay:200,duration:220});
 animate(root.querySelector('.portal-smile'),[{opacity:1},{opacity:0}],{delay:200,duration:220});
 animate(root.querySelector('.portal-camera'),[{transform:'scale(.72)',opacity:0},{transform:'scale(1)',opacity:1,offset:.22},{transform:'scale(1)',opacity:1,offset:.5},{transform:'scale(18)',opacity:1}],{duration:1250,easing:'linear'});
 later(()=>{root.dataset.phase='dive';},620);
 later(()=>{reveal();animate(root.querySelector('.portal-result'),[{transform:'scale(.25)',opacity:0},{transform:'scale(1)',opacity:1}],{duration:380});},1120);
 later(()=>{animate(root,[{opacity:1},{opacity:0}],{duration:260});},2480);
 later(()=>{cancelPortal();startRoutes();},2750);
}
addEventListener('keydown',e=>{if(e.key==='Escape')overlay?.querySelector('button').click();});
