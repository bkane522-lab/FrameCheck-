import assert from 'node:assert/strict';
import {CadreEngine,angle3D} from './cadre-engine.mjs';

function sample(overrides={}){
  return {armL:0.30,armR:0.30,elbowL:100,elbowR:100,elbowL3D:100,elbowR3D:100,torsion:8,back:5,...overrides};
}

const engine=new CadreEngine({baselineSamples:5,recentWindow:3,evidenceSamples:2});
for(let i=0;i<5;i++)engine.ingest(sample());
assert.equal(engine.baselineReady,true,'baseline should be ready');
for(let i=0;i<20;i++)engine.ingest(sample());
assert.equal(engine.summary().label,'Stable');

const left=new CadreEngine({baselineSamples:5,recentWindow:2,evidenceSamples:2});
for(let i=0;i<5;i++)left.ingest(sample());
left.ingest(sample({armL:0.60}));
const alert=left.ingest(sample({armL:0.60}));
assert.match(alert.text,/bras gauche/i);

const rot=new CadreEngine({baselineSamples:5,recentWindow:2,evidenceSamples:2});
for(let i=0;i<5;i++)rot.ingest(sample());
rot.ingest(sample({torsion:35}));
const rotAlert=rot.ingest(sample({torsion:35}));
assert.match(rotAlert.text,/rotation/i);

const a={x:1,y:0,z:0},b={x:0,y:0,z:0},c={x:0,y:1,z:0};
assert.ok(Math.abs(angle3D(a,b,c)-90)<1e-9);
console.log('FrameCheck Cadre engine tests: OK');
