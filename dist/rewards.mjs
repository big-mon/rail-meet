// Full-precision distances decide the crown; epsilon only absorbs floating-point noise.
export function expeditionReward(routes){
 const max=Math.max(...routes.map(r=>r.km));
 const winners=max===0?[]:routes.flatMap((r,i)=>Math.abs(r.km-max)<=1e-9?[i]:[]);
 return {max,winners,roundedTie:winners.length>0&&routes.some((r,i)=>!winners.includes(i)&&r.km.toFixed(1)===max.toFixed(1))};
}
