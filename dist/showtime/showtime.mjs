// The shared viewport portal owns the reveal on both routes.
function sizeStage(){const panel=document.querySelector('.map-panel');if(panel.getBoundingClientRect().height===0)return;const top=panel.getBoundingClientRect().top+scrollY;const height=Math.max(innerWidth<=760?400:490,innerHeight-top-10);panel.style.setProperty('--stage-height',height+'px');}
new ResizeObserver(sizeStage).observe(document.querySelector('.inputs'));new MutationObserver(sizeStage).observe(document.querySelector('#results'),{attributes:true,attributeFilter:['hidden']});addEventListener('resize',sizeStage);sizeStage();

document.addEventListener('results-layout',sizeStage);
