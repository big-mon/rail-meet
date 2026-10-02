import assert from 'node:assert/strict';
import {expeditionReward as reward} from '../dist/rewards.mjs';
const test=(kms,winners,rounded=false)=>{const r=reward(kms.map(km=>({km})));assert.deepEqual(r.winners,winners);assert.equal(r.roundedTie,rounded);};
test([33.92635034550794,33.945039083995454],[1],true);
test([10,10,0],[0,1]);test([0,0,0,0],[]);test([5,5,5,5],[0,1,2,3]);
test([2,7,7,0],[1,2]);test([7,2],[0]);test([2,7],[1]);test([1+1e-12,1],[0,1]);test([1,1.000001],[1],true);
console.log('PASS reward full-precision winner, rounded-display ambiguity, ties, duplicate origins, zero distance, numerical tolerance');
