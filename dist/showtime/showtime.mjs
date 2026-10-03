const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body,actor=document.querySelector('.stage-hero'),shout=document.querySelector('.show-shout');
const effects=new Set(),props=new Set();let previous='';
function effect(el,frames,options){if(reduced.matches)return;const a=el.animate(frames,{easing:'cubic-bezier(.2,.8,.2,1)',...options});effects.add(a);a.onfinish=a.oncancel=()=>effects.delete(a);return a;}
function clear(){effects.forEach(a=>a.cancel());effects.clear();props.forEach(e=>e.remove());props.clear();body.dataset.show='idle';actor.src='hero.png';shout.textContent='';previous='';}
function punch(){
 const home=actor.getBoundingClientRect(),button=document.querySelector('#find').getBoundingClientRect();
 const hero=document.createElement('img');hero.src=preload.complete&&preload.naturalWidth?'showtime/hero-send.png':'hero.png';hero.className='punch-hero';hero.alt='';hero.setAttribute('aria-hidden','true');
 Object.assign(hero.style,{left:home.x+'px',top:home.y+'px',width:home.width+'px',height:home.height+'px'});body.append(hero);props.add(hero);
 const dx=button.x+button.width*.82-(home.x+home.width*.86),dy=button.bottom-(home.y+home.height*.09);
 const a=effect(hero,[{transform:'translate(0,0) scale(.9)'},{transform:`translate(${dx}px,${dy}px) scale(1.04)`,offset:.42},{transform:`translate(${dx*.9}px,${dy*.9}px) scale(1.01)`,offset:.65},{transform:'translate(0,0) scale(1)'}],{duration:410});
 if(a)a.onfinish=()=>{effects.delete(a);hero.remove();props.delete(hero);};
 const ring=document.createElement('span');ring.className='button-impact';Object.assign(ring.style,{left:(button.x+button.width*.82-32)+'px',top:(button.bottom-32)+'px',width:'64px',height:'64px'});body.append(ring);props.add(ring);const impact=effect(ring,[{transform:'scale(.3)',opacity:0},{transform:'scale(1)',opacity:1,offset:.4},{transform:'scale(1.8)',opacity:0}],{duration:300,delay:110});if(impact)impact.onfinish=()=>{effects.delete(impact);ring.remove();props.delete(ring);};
}
function stage(){
 const next=document.querySelector('#celebration').dataset.stage;
 if(!next){clear();return;}if(next===previous)return;previous=next;
 if(reduced.matches){clear();shout.textContent='集合っ★';return;}
 body.dataset.show=next;
 if(next==='send'){shout.textContent='そーれっ★';punch();}
 if(next==='run'){actor.src=preload.complete&&preload.naturalWidth?'showtime/hero-send.png':'hero.png';shout.textContent='くるぅ〜！';effect(actor,[{transform:'translateX(-25px) rotate(-7deg)'},{transform:'translateX(0) rotate(0)'}],{duration:350});}
 if(next==='merge'){
  actor.src='hero.png';shout.textContent='集合っ!!';effect(actor,[{transform:'translateY(40px) scale(.85)'},{transform:'translateY(-15px) scale(1.15)',offset:.6},{transform:'translateY(0) scale(1)'}],{duration:560});effect(shout,[{transform:'rotate(-7deg) scale(.4)',opacity:0},{transform:'rotate(-7deg) scale(1.3)',opacity:1,offset:.55},{transform:'rotate(-7deg) scale(1)',opacity:1}],{duration:500});
  const pieces=[...document.querySelectorAll('.arrival-piece')];pieces.forEach((e,i)=>effect(e,[{transform:`translate(${(i-(pieces.length-1)/2)*100}px,-90px) scale(1.5)`,opacity:0},{transform:`translate(${(i-(pieces.length-1)/2)*35}px,-42px) scale(1.25)`,opacity:1}],{duration:260,fill:'forwards'}));
 }
 if(next==='award'){
  shout.textContent='勇者に、王冠！';document.querySelectorAll('.personal-crown').forEach(e=>effect(e,[{transform:'translateY(-100px) scale(3.5) rotate(-20deg)',opacity:0},{transform:'translateY(4px) scale(1.25) rotate(6deg)',opacity:1,offset:.7},{transform:'translateY(0) scale(1)',opacity:1}],{duration:520}));effect(document.querySelector('#reward'),[{transform:'scale(.95)'},{transform:'scale(1.07)',offset:.6},{transform:'scale(1)'}],{duration:450});
  if(!document.querySelector('[data-winner]'))shout.textContent='ここで集合っ★';
 }
 if(next==='settled'){shout.textContent='';props.forEach(e=>e.remove());props.clear();}
}
new MutationObserver(stage).observe(document.querySelector('#celebration'),{attributes:true,attributeFilter:['data-stage']});
document.addEventListener('click',e=>{if(e.target.closest('#find,[data-candidate],#add,[data-remove],[data-person]'))clear();},true);
document.addEventListener('change',clear,true);reduced.addEventListener('change',clear);
// Decode the launch pose before the first activation; no action waits for image loading.
const preload=new Image();preload.src='showtime/hero-send.png';
function sizeStage(){const panel=document.querySelector('.map-panel');if(panel.getBoundingClientRect().height===0)return;const top=panel.getBoundingClientRect().top+scrollY;const height=Math.max(innerWidth<=760?400:490,innerHeight-top-10);panel.style.setProperty('--stage-height',height+'px');}
new ResizeObserver(sizeStage).observe(document.querySelector('.inputs'));new MutationObserver(sizeStage).observe(document.querySelector('#results'),{attributes:true,attributeFilter:['hidden']});addEventListener('resize',sizeStage);sizeStage();

document.addEventListener('results-layout',sizeStage);
