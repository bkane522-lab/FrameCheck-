const DEFAULTS = Object.freeze({
  baselineSamples: 20,          // ~2 s at 10 Hz
  recentWindow: 10,             // ~1 s
  evidenceSamples: 7,           // condition must persist ~0.7 s
  armDropTorso: 0.22,           // provisional, relative to personal baseline
  elbowCloseDegrees: 25,        // provisional, relative to personal baseline
  rotationDeltaDegrees: 22      // descriptive only; not scored as right/wrong
});

function finite(values){return values.filter(Number.isFinite)}
function median(values){
  const a=finite(values).sort((x,y)=>x-y);
  if(!a.length)return NaN;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

export class CadreEngine {
  constructor(options={}){
    this.cfg={...DEFAULTS,...options};
    this.reset();
  }

  reset(){
    this.baselineBuffer=[];
    this.baseline=null;
    this.recent=[];
    this.analysis=[];
    this.evidence={left:0,right:0,both:0,rotation:0};
  }

  get baselineReady(){return Boolean(this.baseline)}
  get baselineProgress(){return clamp(this.baselineBuffer.length/this.cfg.baselineSamples,0,1)}

  ingest(sample){
    if(!sample)return this._neutral('👀','Repères insuffisants pour analyser le cadre.');

    if(!this.baseline){
      this.baselineBuffer.push(sample);
      if(this.baselineBuffer.length>=this.cfg.baselineSamples){
        this.baseline=this._makeBaseline(this.baselineBuffer);
        return {phase:'ready',kind:'good',symbol:'✓',text:'Repère de départ enregistré. Dansez naturellement.'};
      }
      const remaining=Math.max(1,Math.ceil((this.cfg.baselineSamples-this.baselineBuffer.length)/10));
      return {phase:'baseline',kind:'',symbol:'◎',text:`Gardez votre cadre naturel encore ${remaining} s.`};
    }

    this.analysis.push(sample);
    this.recent.push(sample);
    if(this.recent.length>this.cfg.recentWindow)this.recent.shift();

    const state=this._stateFrom(this.recent);
    this._updateEvidence(state);

    if(this.evidence.both>=this.cfg.evidenceSamples){
      return {phase:'analysis',kind:'warn',symbol:'↕️',text:'Vos deux bras se sont éloignés du repère de départ. Si ce n’est pas intentionnel, revenez doucement vers votre cadre initial.'};
    }
    if(this.evidence.left>=this.cfg.evidenceSamples){
      return {phase:'analysis',kind:'warn',symbol:'↖️',text:'Le bras gauche s’est éloigné du repère de départ. Si ce n’est pas intentionnel, rapprochez-le doucement de votre cadre initial.'};
    }
    if(this.evidence.right>=this.cfg.evidenceSamples){
      return {phase:'analysis',kind:'warn',symbol:'↗️',text:'Le bras droit s’est éloigné du repère de départ. Si ce n’est pas intentionnel, rapprochez-le doucement de votre cadre initial.'};
    }
    if(this.evidence.rotation>=this.cfg.evidenceSamples){
      return {phase:'analysis',kind:'',symbol:'🔄',text:'Une variation de rotation épaules-bassin est visible par rapport au repère de départ.'};
    }
    return {phase:'analysis',kind:'good',symbol:'✅',text:'Cadre proche de votre repère de départ. Continuez naturellement.'};
  }

  summary(){
    if(!this.baseline)return {enough:false,reason:'baseline_not_ready'};
    if(this.analysis.length<20)return {enough:false,reason:'session_short',baseline:this.baseline,sampleCount:this.analysis.length};

    let stable=0,leftChanges=0,rightChanges=0;
    const rotationDeltas=[];
    const armDeltas=[];
    for(const s of this.analysis){
      const st=this._stateFrom([s]);
      if(!st.leftChanged&&!st.rightChanged)stable++;
      if(st.leftChanged)leftChanges++;
      if(st.rightChanged)rightChanges++;
      rotationDeltas.push(Math.abs(st.rotationDelta));
      armDeltas.push(Math.max(Math.abs(st.armDeltaL),Math.abs(st.armDeltaR)));
    }
    const n=this.analysis.length;
    const stableRatio=stable/n;
    const label=stableRatio>=0.80?'Stable':stableRatio>=0.60?'Variable':'À observer';
    return {
      enough:true,
      sampleCount:n,
      baseline:this.baseline,
      stableRatio,
      label,
      leftChangeRatio:leftChanges/n,
      rightChangeRatio:rightChanges/n,
      medianRotationDelta:median(rotationDeltas),
      medianArmDelta:median(armDeltas)
    };
  }

  _makeBaseline(samples){
    return {
      armL:median(samples.map(s=>s.armL)),
      armR:median(samples.map(s=>s.armR)),
      elbowL:median(samples.map(s=>Number.isFinite(s.elbowL3D)?s.elbowL3D:s.elbowL)),
      elbowR:median(samples.map(s=>Number.isFinite(s.elbowR3D)?s.elbowR3D:s.elbowR)),
      torsion:median(samples.map(s=>s.torsion)),
      back:median(samples.map(s=>s.back))
    };
  }

  _stateFrom(samples){
    const armL=median(samples.map(s=>s.armL));
    const armR=median(samples.map(s=>s.armR));
    const elbowL=median(samples.map(s=>Number.isFinite(s.elbowL3D)?s.elbowL3D:s.elbowL));
    const elbowR=median(samples.map(s=>Number.isFinite(s.elbowR3D)?s.elbowR3D:s.elbowR));
    const torsion=median(samples.map(s=>s.torsion));

    const armDeltaL=armL-this.baseline.armL;
    const armDeltaR=armR-this.baseline.armR;
    const elbowCloseL=this.baseline.elbowL-elbowL;
    const elbowCloseR=this.baseline.elbowR-elbowR;
    const rotationDelta=torsion-this.baseline.torsion;

    const leftChanged=armDeltaL>this.cfg.armDropTorso || elbowCloseL>this.cfg.elbowCloseDegrees;
    const rightChanged=armDeltaR>this.cfg.armDropTorso || elbowCloseR>this.cfg.elbowCloseDegrees;
    return {
      armDeltaL,armDeltaR,elbowCloseL,elbowCloseR,rotationDelta,
      leftChanged,rightChanged,
      bothChanged:leftChanged&&rightChanged,
      rotationChanged:Math.abs(rotationDelta)>this.cfg.rotationDeltaDegrees
    };
  }

  _updateEvidence(state){
    const step=(key,on)=>{this.evidence[key]=on?Math.min(this.cfg.evidenceSamples+2,this.evidence[key]+1):Math.max(0,this.evidence[key]-1)};
    step('both',state.bothChanged);
    step('left',state.leftChanged&&!state.bothChanged);
    step('right',state.rightChanged&&!state.bothChanged);
    step('rotation',state.rotationChanged&&!state.leftChanged&&!state.rightChanged);
  }

  _neutral(symbol,text){return {phase:'waiting',kind:'',symbol,text}}
}

export function angle3D(a,b,c){
  if(!a||!b||!c)return NaN;
  const v1={x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};
  const v2={x:c.x-b.x,y:c.y-b.y,z:c.z-b.z};
  const m1=Math.hypot(v1.x,v1.y,v1.z),m2=Math.hypot(v2.x,v2.y,v2.z);
  if(!m1||!m2)return NaN;
  const cos=clamp((v1.x*v2.x+v1.y*v2.y+v1.z*v2.z)/(m1*m2),-1,1);
  return Math.acos(cos)*180/Math.PI;
}
