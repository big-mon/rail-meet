import {formatKm} from './distance.mjs';
// Awards match the exact distance text users see. Route ranking stays full precision.
export function expeditionReward(routes){
 const max=Math.max(...routes.map(r=>r.km)),displayMax=formatKm(max);
 const winners=Number(displayMax)===0?[]:routes.flatMap((r,i)=>formatKm(r.km)===displayMax?[i]:[]);
 return {max,winners};
}
