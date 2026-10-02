import assert from 'node:assert/strict';
import {expeditionReward as reward} from '../dist/rewards.mjs';
import {formatKm} from '../dist/distance.mjs';
const test=(kms,winners)=>{const r=reward(kms.map(km=>({km})));assert.deepEqual(r.winners,winners);for(const i of winners)assert.equal(formatKm(kms[i]),formatKm(r.max));};
test([33.92635034550794,33.945039083995454],[0,1]);
test([33.9499,33.9501],[1]);test([33.9001,33.94,33.949],[0,1,2]);test([5.001,5.01,5.02,5.049],[0,1,2,3]);
test([0,0,0,0],[]);test([.001,.0499],[]);test([.0499,.0501],[1]);
test([10,10,0],[0,1]);test([2,7,7,0],[1,2]);test([7,2],[0]);test([2,7],[1]);test([1,1.000001],[0,1]);
console.log('PASS display-shared rounding: default A+B, boundary splits, three/four ties, zero display and candidate winners');
