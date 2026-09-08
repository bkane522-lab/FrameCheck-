import assert from 'node:assert/strict';
import { MarcheEngine } from './marche-engine.mjs';

const e=new MarcheEngine({minSamples:20,movementThreshold:0.002,footMovementThreshold:0.002,switchDominance:1.1});
for(let i=0;i<30;i++){
  const phase=i%4;
  const left=phase<2?0.44+0.02*phase:0.46;
  const right=phase>=2?0.56+0.02*(phase-2):0.56;
  e.ingest({
    hipX:0.5+i*0.002,
    hipY:0.55+Math.sin(i/3)*0.002,
    ankleLX:left,
    ankleLY:0.90-(phase<2?0.01*phase:0),
    ankleRX:right,
    ankleRY:0.90-(phase>=2?0.01*(phase-2):0)
  });
}
const s=e.summary();
assert.equal(s.enough,true);
assert.ok(s.movingRatio>0);
assert.ok(s.switches>=1);
assert.match(s.displacementLabel,/Visible|Léger|Peu visible/);
console.log('test-marche: OK');
