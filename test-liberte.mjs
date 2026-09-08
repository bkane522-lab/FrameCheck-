import assert from 'node:assert/strict';
import { LiberteEngine } from './liberte-engine.mjs';

{
  const e=new LiberteEngine({minSamples:30});
  for(let i=0;i<40;i++){
    e.ingest({
      hipX:0.5+0.12*Math.sin(i/5),
      hipY:0.55+0.08*Math.cos(i/7),
      armL:0.1+0.5*Math.sin(i/4),
      armR:0.2+0.5*Math.cos(i/6),
      torsion:10+25*Math.abs(Math.sin(i/8))
    });
  }
  const s=e.summary();
  assert.equal(s.enough,true);
  assert.ok(s.horizontalRange>0.1);
  assert.ok(s.rotationRange>10);
}

{
  const e=new LiberteEngine({minSamples:20});
  for(let i=0;i<25;i++)e.ingest({hipX:.5,hipY:.55,armL:.2,armR:.2,torsion:5});
  const s=e.summary();
  assert.equal(s.enough,true);
  assert.ok(s.repetition>0.8);
  assert.match(s.repetitionLabel,/répétés/i);
}
console.log('test-liberte: OK');
