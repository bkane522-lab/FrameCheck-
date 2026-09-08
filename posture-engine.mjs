const DEFAULTS = Object.freeze({
  baselineSamples: 20,          // ~2 s at 10 Hz
  recentWindow: 10,             // ~1 s
  evidenceSamples: 7,           // ~0.7 s of persistent change
  axisDeltaDegrees: 10,         // provisional, relative to personal baseline
  shoulderTiltDelta: 0.10,      // provisional, normalized by torso length
  hipTiltDelta: 0.10            // provisional, normalized by torso length
});

function finite(values){return values.filter(Number.isFinite)}
function median(values){
  const a=finite(values).sort((x,y)=>x-y);
  if(!a.length)return NaN;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

export class PostureEngine {
  constructor(options={}){this.cfg={...DEFAULTS,...options};this.reset()}
  reset(){
    this.baselineBuffer=[];this.baseline=null;this.recent=[];this.analysis=[];
    this.evidence={axis:0,shoulders:0,hips:0};
  }
  get baselineReady(){return Boolean(this.baseline)}
  get baselineProgress(){return clamp(this.baselineBuffer.length/this.cfg.baselineSamples,0,1)}

  ingest(sample){
    if(!sample)return {phase:'waiting',kind:'',symbol:'👀',text:'Repères insuffisants pour observer la posture.'};
    if(!this.baseline){
      this.baselineBuffer.push(sample);
      if(this.baselineBuffer.length>=this.cfg.baselineSamples){
        this.baseline=this._makeBaseline(this.baselineBuffer);
        return {phase:'ready',kind:'good',symbol:'✓',text:'Repère de départ enregistré. Bougez naturellement.'};
      }
      const remaining=Math.max(1,Math.ceil((this.cfg.baselineSamples-this.baselineBuffer.length)/10));
      return {phase:'baseline',kind:'',symbol:'◎',text:`Gardez votre posture naturelle encore ${remaining} s.`};
    }

    this.analysis.push(sample);
    this.recent.push(sample);
    if(this.recent.length>this.cfg.recentWindow)this.recent.shift();
    const state=this._stateFrom(this.recent);
    this._step('axis',state.axisChanged);
    this._step('shoulders',state.shouldersChanged&&!state.axisChanged);
    this._step('hips',state.hipsChanged&&!state.axisChanged&&!state.shouldersChanged);

    if(this.evidence.axis>=this.cfg.evidenceSamples){
      return {phase:'analysis',kind:'warn',symbol:'↔️',text:'L’axe de votre buste s’est éloigné de votre repère de départ dans l’image. Vérifiez aussi que le téléphone n’a pas bougé.'};
    }
    if(this.evidence.shoulders>=this.cfg.evidenceSamples){
      return {phase:'analysis',kind:'warn',symbol:'↔️',text:'L’inclinaison visible des épaules a changé par rapport au repère de départ.'};
    }
    if(this.evidence.hips>=this.cfg.evidenceSamples){
      return {phase:'analysis',kind:'',symbol:'↔️',text:'L’inclinaison visible du bassin a changé par rapport au repère de départ.'};
    }
    return {phase:'analysis',kind:'good',symbol:'✅',text:'Posture proche de votre repère de départ dans l’image.'};
  }

  summary(){
    if(!this.baseline)return {enough:false,reason:'baseline_not_ready'};
    if(this.analysis.length<30)return {enough:false,reason:'session_short',sampleCount:this.analysis.length,baseline:this.baseline};
    let axisStable=0,shoulderStable=0,hipStable=0;
    const axisDeltas=[],shoulderDeltas=[],hipDeltas=[];
    for(const s of this.analysis){
      const st=this._stateFrom([s]);
      if(!st.axisChanged)axisStable++;
      if(!st.shouldersChanged)shoulderStable++;
      if(!st.hipsChanged)hipStable++;
      axisDeltas.push(Math.abs(st.axisDelta));
      shoulderDeltas.push(Math.abs(st.shoulderDelta));
      hipDeltas.push(Math.abs(st.hipDelta));
    }
    const n=this.analysis.length;
    const overall=(axisStable+shoulderStable+hipStable)/(3*n);
    return {
      enough:true,sampleCount:n,baseline:this.baseline,
      overallStableRatio:overall,
      axisStableRatio:axisStable/n,shoulderStableRatio:shoulderStable/n,hipStableRatio:hipStable/n,
      medianAxisDelta:median(axisDeltas),medianShoulderDelta:median(shoulderDeltas),medianHipDelta:median(hipDeltas),
      label:overall>=0.85?'Proche du repère':overall>=0.65?'Variable':'À observer'
    };
  }

  _makeBaseline(samples){
    return {
      back:median(samples.map(s=>s.back)),
      shoulderTiltSigned:median(samples.map(s=>s.shoulderTiltSigned)),
      hipTiltSigned:median(samples.map(s=>s.hipTiltSigned))
    };
  }
  _stateFrom(samples){
    const back=median(samples.map(s=>s.back));
    const shoulder=median(samples.map(s=>s.shoulderTiltSigned));
    const hip=median(samples.map(s=>s.hipTiltSigned));
    const axisDelta=back-this.baseline.back;
    const shoulderDelta=shoulder-this.baseline.shoulderTiltSigned;
    const hipDelta=hip-this.baseline.hipTiltSigned;
    return {
      axisDelta,shoulderDelta,hipDelta,
      axisChanged:Math.abs(axisDelta)>this.cfg.axisDeltaDegrees,
      shouldersChanged:Math.abs(shoulderDelta)>this.cfg.shoulderTiltDelta,
      hipsChanged:Math.abs(hipDelta)>this.cfg.hipTiltDelta
    };
  }
  _step(key,on){this.evidence[key]=on?Math.min(this.cfg.evidenceSamples+2,this.evidence[key]+1):Math.max(0,this.evidence[key]-1)}
}
