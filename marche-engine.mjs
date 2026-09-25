const DEFAULTS = Object.freeze({
  minSamples: 50,
  recentWindow: 20,
  movementThreshold: 0.010,
  footMovementThreshold: 0.008,
  switchDominance: 1.35,
  pauseRatioThreshold: 0.55
});
function finite(values){return values.filter(Number.isFinite)}
function median(values){const a=finite(values).sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function range(values){const a=finite(values);return a.length?Math.max(...a)-Math.min(...a):0}
function pointMotion(x1,y1,x0,y0){return [x1,y1,x0,y0].every(Number.isFinite)?Math.hypot(x1-x0,y1-y0):NaN}
export class MarcheEngine {
  constructor(options={}){this.cfg={...DEFAULTS,...options};this.reset()}
  reset(){this.samples=[];this.recent=[];this.prev=null;this.lastDominant=null;this.switches=0;this.movingFrames=0;this.validFrames=0}
  ingest(sample){
    if(!sample)return {phase:'waiting',kind:'',symbol:'👀',text:'Repères insuffisants pour observer la marche.'};
    const motion=this._motion(sample,this.prev);this.prev=sample;
    if(!Number.isFinite(motion.totalMotion))return {phase:'analysis',kind:'',symbol:'↻',text:'Pivot ou masquage partiel : le suivi continue avec les repères encore visibles.'};
    const enriched={...sample,...motion};this.samples.push(enriched);this.recent.push(enriched);if(this.recent.length>this.cfg.recentWindow)this.recent.shift();this.validFrames++;
    if(motion.totalMotion>this.cfg.movementThreshold)this.movingFrames++;
    const dom=this._dominantFoot(motion);if(dom&&this.lastDominant&&dom!==this.lastDominant)this.switches++;if(dom)this.lastDominant=dom;
    if(this.samples.length<10)return {phase:'analysis',kind:'',symbol:'🚶',text:'Marchez naturellement, y compris pendant les changements de direction.'};
    const recentMotion=median(this.recent.map(s=>s.totalMotion)),recentFoot=median(this.recent.map(s=>s.footMotion));
    if(recentMotion<this.cfg.movementThreshold*.75&&(!Number.isFinite(recentFoot)||recentFoot<this.cfg.footMovementThreshold))return {phase:'analysis',kind:'',symbol:'🚶',text:'Peu de déplacement est visible sur ces dernières secondes.'};
    if(this.switches>=2)return {phase:'analysis',kind:'good',symbol:'✅',text:'Déplacement et alternance visible des appuis détectés.'};
    return {phase:'analysis',kind:'good',symbol:'✅',text:'Déplacement visible. Continuez à marcher naturellement.'};
  }
  summary(){
    const n=this.samples.length;if(n<this.cfg.minSamples)return {enough:false,reason:'session_short',sampleCount:n};
    const movingRatio=this.movingFrames/Math.max(1,this.validFrames),horizontalRange=range(this.samples.map(s=>s.hipX)),verticalRange=range(this.samples.map(s=>s.hipY)),footActivity=median(this.samples.map(s=>s.footMotion)),path=this.samples.reduce((sum,s)=>sum+(Number.isFinite(s.hipMotion)?s.hipMotion:0),0),pauseRatio=1-movingRatio;
    return {enough:true,sampleCount:n,movingRatio,pauseRatio,horizontalRange,verticalRange,footActivity,path,switches:this.switches,displacementLabel:(horizontalRange+verticalRange)>=.07?'Visible':(horizontalRange+verticalRange)>=.035?'Léger':'Peu visible',continuityLabel:pauseRatio<=.25?'Plutôt continue':pauseRatio<=this.cfg.pauseRatioThreshold?'Variable':'Avec plusieurs pauses',alternationLabel:this.switches>=4?'Alternance visible':this.switches>=1?'Quelques alternances visibles':'Peu d’alternance détectée'};
  }
  _motion(s,p){
    if(!p)return {hipMotion:0,leftFootMotion:NaN,rightFootMotion:NaN,footMotion:NaN,totalMotion:0};
    const hipMotion=pointMotion(s.hipX,s.hipY,p.hipX,p.hipY),leftFootMotion=pointMotion(s.ankleLX,s.ankleLY,p.ankleLX,p.ankleLY),rightFootMotion=pointMotion(s.ankleRX,s.ankleRY,p.ankleRX,p.ankleRY);
    const feet=finite([leftFootMotion,rightFootMotion]);const footMotion=feet.length?feet.reduce((a,b)=>a+b,0)/feet.length:NaN;
    const parts=finite([hipMotion,footMotion]);const totalMotion=parts.length?parts.reduce((a,b)=>a+b,0):NaN;
    return {hipMotion,leftFootMotion,rightFootMotion,footMotion,totalMotion};
  }
  _dominantFoot(m){
    const L=m.leftFootMotion,R=m.rightFootMotion;
    if(!Number.isFinite(L)&&!Number.isFinite(R))return null;
    if(Number.isFinite(L)&&!Number.isFinite(R))return L>=this.cfg.footMovementThreshold?'L':null;
    if(Number.isFinite(R)&&!Number.isFinite(L))return R>=this.cfg.footMovementThreshold?'R':null;
    if(L<this.cfg.footMovementThreshold&&R<this.cfg.footMovementThreshold)return null;
    if(L>R*this.cfg.switchDominance)return 'L';if(R>L*this.cfg.switchDominance)return 'R';return null;
  }
}
