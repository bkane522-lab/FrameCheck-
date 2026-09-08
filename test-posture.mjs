import assert from 'node:assert/strict';
import { PostureEngine } from './posture-engine.mjs';

function sample(overrides={}){
  return {back:4,shoulderTiltSigned:0.01,hipTiltSigned:0.01,...overrides};
}

{
  const e=new PostureEngine({baselineSamples:5,recentWindow:3,evidenceSamples:2,axisDeltaDegrees:8});
  for(let i=0;i<5;i++)e.ingest(sample());
  assert.equal(e.baselineReady,true);
  assert.equal(e.ingest(sample()).kind,'good');
  e.ingest(sample({back:20}));
  e.ingest(sample({back:20}));
  const signal=e.ingest(sample({back:20}));
  assert.equal(signal.kind,'warn');
  assert.match(signal.text,/axe/i);
}

{
  const e=new PostureEngine({baselineSamples:5});
  for(let i=0;i<5;i++)e.ingest(sample());
  for(let i=0;i<35;i++)e.ingest(sample({back:5,shoulderTiltSigned:0.02,hipTiltSigned:0.01}));
  const s=e.summary();
  assert.equal(s.enough,true);
  assert.ok(s.overallStableRatio>0.8);
}
console.log('test-posture: OK');
