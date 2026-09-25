const DEFAULTS = Object.freeze({
  baselineSamples: 20,
  recentWindow: 10,
  evidenceSamples: 7,
  armDropTorso: 0.22,
  elbowCloseDegrees: 25,
  rotationDeltaDegrees: 22
});

function finite(values){return values.filter(Number.isFinite)}
function median(values){const a=finite(values).sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function elbowValue(s,side){const a=s?.[`elbow${side}3D`],b=s?.[`elbow${side}`];return Number.isFinite(a)?a:b}
function baselineReadySample(s){return Number.isFinite(s?.armL)&&Number.isFinite(s?.armR)&&Number.isFinite(elbowValue(s,'L'))&&Number.isFinite(elbowValue(s,'R'))&&Number.isFinite(s?.torsion)}

export class CadreEngine {
  constructor(options={}){this.cfg={...DEFAULTS,...options};this.reset()}
  reset(){this.baselineBuffer=[];this.baseline=null;this.recent=[];this.analysis=[];this.evidence={left:0,right:0,both:0,rotation:0}}
  get baselineReady(){return Boolean(this.baseline)}
  get baselineProgress(){return clamp(this.baselineBuffer.length/this.cfg.baselineSamples,0,1)}

  ingest(sample){
    if(!sample)return this._neutral('👀','Repères insuffisants pour analyser le cadre.');
    if(!this.baseline){
      if(!baselineReadySample(sample))return {phase:'baseline',kind:'',symbol:'👀',text:'Gardez les deux bras visibles quelques instants pour créer votre repère de départ.'};
      this.baselineBuffer.push(sample);
      if(this.baselineBuffer.length>=this.cfg.baselineSamples){this.baseline=this._makeBaseline(this.baselineBuffer);return {phase:'ready',kind:'good',symbol:'✓',text:'Repère de départ enregistré. Dansez naturellement.'}}
      const remaining=Math.max(1,Math.ceil((this.cfg.baselineSamples-this.baselineBuffer.length)/10));
      return {phase:'baseline',kind:'',symbol:'◎',text:`Gardez votre cadre naturel encore ${remaining} s.`};
    }

    this.analysis.push(sample);this.recent.push(sample);if(this.recent.length>this.cfg.recentWindow)this.recent.shift();
    const state=this._stateFrom(this.recent);this._updateEvidence(state);
    if(!state.leftObserved&&!state.rightObserved)return {phase:'analysis',kind:'',symbol:'↻',text:'Pivot visible : les bras sont momentanément masqués. Le suivi continue sans conclure sur le cadre.'};
    if(this.evidence.both>=this.cfg.evidenceSamples)return {phase:'analysis',kind:'warn',symbol:'↕️',text:'Vos deux bras se sont éloignés du repère de départ. Si ce n’est pas intentionnel, revenez doucement vers votre cadre initial.'};
    if(this.evidence.left>=this.cfg.evidenceSamples)return {phase:'analysis',kind:'warn',symbol:'↖️',text:'Le bras gauche s’est éloigné du repère de départ. Si ce n’est pas intentionnel, rapprochez-le doucement de votre cadre initial.'};
    if(this.evidence.right>=this.cfg.evidenceSamples)return {phase:'analysis',kind:'warn',symbol:'↗️',text:'Le bras droit s’est éloigné du repère de départ. Si ce n’est pas intentionnel, rapprochez-le doucement de votre cadre initial.'};
    if(this.evidence.rotation>=this.cfg.evidenceSamples)return {phase:'analysis',kind:'',symbol:'🔄',text:'Une variation de rotation épaules-bassin est visible par rapport au repère de départ.'};
    return {phase:'analysis',kind:'good',symbol:'✅',text:'Cadre proche de votre repère de départ sur les repères actuellement visibles.'};
  }

  summary(){
    if(!this.baseline)return {enough:false,reason:'baseline_not_ready'};
    if(this.analysis.length<20)return {enough:false,reason:'session_short',baseline:this.baseline,sampleCount:this.analysis.length};
    let observed=0,stable=0,leftObserved=0,rightObserved=0,leftChanges=0,rightChanges=0;
    const rotationDeltas=[],armDeltas=[];
    for(const s of this.analysis){
      const st=this._stateFrom([s]);
      if(st.leftObserved||st.rightObserved){observed++;if(!st.leftChanged&&!st.rightChanged)stable++}
      if(st.leftObserved){leftObserved++;if(st.leftChanged)leftChanges++;if(Number.isFinite(st.armDeltaL))armDeltas.push(Math.abs(st.armDeltaL))}
      if(st.rightObserved){rightObserved++;if(st.rightChanged)rightChanges++;if(Number.isFinite(st.armDeltaR))armDeltas.push(Math.abs(st.armDeltaR))}
      if(Number.isFinite(st.rotationDelta))rotationDeltas.push(Math.abs(st.rotationDelta));
    }
    if(observed<10)return {enough:false,reason:'tracking_partial',baseline:this.baseline,sampleCount:observed};
    const stableRatio=stable/observed;
    return {enough:true,sampleCount:observed,baseline:this.baseline,stableRatio,label:stableRatio>=.80?'Stable':stableRatio>=.60?'Variable':'À observer',leftChangeRatio:leftObserved?leftChanges/leftObserved:NaN,rightChangeRatio:rightObserved?rightChanges/rightObserved:NaN,medianRotationDelta:median(rotationDeltas),medianArmDelta:median(armDeltas),leftObserved,rightObserved};
  }

  _makeBaseline(samples){return {armL:median(samples.map(s=>s.armL)),armR:median(samples.map(s=>s.armR)),elbowL:median(samples.map(s=>elbowValue(s,'L'))),elbowR:median(samples.map(s=>elbowValue(s,'R'))),torsion:median(samples.map(s=>s.torsion)),back:median(samples.map(s=>s.back))}}
  _stateFrom(samples){
    const armL=median(samples.map(s=>s.armL)),armR=median(samples.map(s=>s.armR)),elbowL=median(samples.map(s=>elbowValue(s,'L'))),elbowR=median(samples.map(s=>elbowValue(s,'R'))),torsion=median(samples.map(s=>s.torsion));
    const leftObserved=Number.isFinite(armL)&&Number.isFinite(elbowL),rightObserved=Number.isFinite(armR)&&Number.isFinite(elbowR),rotationObserved=Number.isFinite(torsion)&&Number.isFinite(this.baseline.torsion);
    const armDeltaL=leftObserved?armL-this.baseline.armL:NaN,armDeltaR=rightObserved?armR-this.baseline.armR:NaN;
    const elbowCloseL=leftObserved?this.baseline.elbowL-elbowL:NaN,elbowCloseR=rightObserved?this.baseline.elbowR-elbowR:NaN,rotationDelta=rotationObserved?torsion-this.baseline.torsion:NaN;
    const leftChanged=leftObserved&&(armDeltaL>this.cfg.armDropTorso||elbowCloseL>this.cfg.elbowCloseDegrees),rightChanged=rightObserved&&(armDeltaR>this.cfg.armDropTorso||elbowCloseR>this.cfg.elbowCloseDegrees);
    return {armDeltaL,armDeltaR,elbowCloseL,elbowCloseR,rotationDelta,leftObserved,rightObserved,leftChanged,rightChanged,bothChanged:leftObserved&&rightObserved&&leftChanged&&rightChanged,rotationChanged:rotationObserved&&Math.abs(rotationDelta)>this.cfg.rotationDeltaDegrees};
  }
  _updateEvidence(state){const step=(key,on)=>{this.evidence[key]=on?Math.min(this.cfg.evidenceSamples+2,this.evidence[key]+1):Math.max(0,this.evidence[key]-1)};step('both',state.bothChanged);step('left',state.leftChanged&&!state.bothChanged);step('right',state.rightChanged&&!state.bothChanged);step('rotation',state.rotationChanged&&!state.leftChanged&&!state.rightChanged)}
  _neutral(symbol,text){return {phase:'waiting',kind:'',symbol,text}}
}

export function angle3D(a,b,c){if(!a||!b||!c)return NaN;const v1={x:a.x-b.x,y:a.y-b.y,z:a.z-b.z},v2={x:c.x-b.x,y:c.y-b.y,z:c.z-b.z};const m1=Math.hypot(v1.x,v1.y,v1.z),m2=Math.hypot(v2.x,v2.y,v2.z);if(!m1||!m2)return NaN;const cos=clamp((v1.x*v2.x+v1.y*v2.y+v1.z*v2.z)/(m1*m2),-1,1);return Math.acos(cos)*180/Math.PI}
