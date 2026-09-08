const DEFAULTS = Object.freeze({
  minSamples: 50,               // ~5 s at 10 Hz
  recentWindow: 20,             // ~2 s
  movementThreshold: 0.010,     // provisional, normalized frame delta per sample
  footMovementThreshold: 0.008, // provisional
  switchDominance: 1.35,        // one foot must move clearly more than the other
  pauseRatioThreshold: 0.55
});

function finite(values){return values.filter(Number.isFinite)}
function median(values){const a=finite(values).sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function range(values){const a=finite(values);return a.length?Math.max(...a)-Math.min(...a):0}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

export class MarcheEngine {
  constructor(options={}){this.cfg={...DEFAULTS,...options};this.reset()}
  reset(){this.samples=[];this.recent=[];this.prev=null;this.lastDominant=null;this.switches=0;this.movingFrames=0;this.validFrames=0}

  ingest(sample){
    if(!sample)return {phase:'waiting',kind:'',symbol:'👀',text:'Repères insuffisants pour observer la marche.'};
    const motion=this._motion(sample,this.prev);
    this.prev=sample;
    const enriched={...sample,...motion};
    this.samples.push(enriched);this.recent.push(enriched);
    if(this.recent.length>this.cfg.recentWindow)this.recent.shift();
    this.validFrames++;
    if(motion.totalMotion>this.cfg.movementThreshold)this.movingFrames++;
    const dom=this._dominantFoot(motion);
    if(dom&&this.lastDominant&&dom!==this.lastDominant)this.switches++;
    if(dom)this.lastDominant=dom;

    if(this.samples.length<10)return {phase:'analysis',kind:'',symbol:'🚶',text:'Marchez naturellement tout en restant entièrement visible.'};
    const recentMotion=median(this.recent.map(s=>s.totalMotion));
    const recentFoot=median(this.recent.map(s=>s.footMotion));
    if(recentMotion<this.cfg.movementThreshold*0.75 && recentFoot<this.cfg.footMovementThreshold){
      return {phase:'analysis',kind:'',symbol:'🚶',text:'Peu de déplacement est visible sur ces dernières secondes.'};
    }
    if(this.switches>=2){
      return {phase:'analysis',kind:'good',symbol:'✅',text:'Déplacement et alternance de mouvement entre les pieds sont visibles.'};
    }
    return {phase:'analysis',kind:'good',symbol:'✅',text:'Déplacement visible. Continuez à marcher naturellement.'};
  }

  summary(){
    const n=this.samples.length;
    if(n<this.cfg.minSamples)return {enough:false,reason:'session_short',sampleCount:n};
    const movingRatio=this.movingFrames/Math.max(1,this.validFrames);
    const horizontalRange=range(this.samples.map(s=>s.hipX));
    const verticalRange=range(this.samples.map(s=>s.hipY));
    const footActivity=median(this.samples.map(s=>s.footMotion));
    const path=this.samples.reduce((sum,s)=>sum+(Number.isFinite(s.hipMotion)?s.hipMotion:0),0);
    const pauseRatio=1-movingRatio;
    return {
      enough:true,sampleCount:n,movingRatio,pauseRatio,horizontalRange,verticalRange,footActivity,path,switches:this.switches,
      displacementLabel:(horizontalRange+verticalRange)>=0.07?'Visible':(horizontalRange+verticalRange)>=0.035?'Léger':'Peu visible',
      continuityLabel:pauseRatio<=0.25?'Plutôt continue':pauseRatio<=this.cfg.pauseRatioThreshold?'Variable':'Avec plusieurs pauses',
      alternationLabel:this.switches>=4?'Alternance visible':this.switches>=1?'Quelques alternances visibles':'Peu d’alternance détectée'
    };
  }

  _motion(s,p){
    if(!p)return {hipMotion:0,leftFootMotion:0,rightFootMotion:0,footMotion:0,totalMotion:0};
    const hipMotion=Math.hypot((s.hipX??0)-(p.hipX??0),(s.hipY??0)-(p.hipY??0));
    const leftFootMotion=Math.hypot((s.ankleLX??0)-(p.ankleLX??0),(s.ankleLY??0)-(p.ankleLY??0));
    const rightFootMotion=Math.hypot((s.ankleRX??0)-(p.ankleRX??0),(s.ankleRY??0)-(p.ankleRY??0));
    const footMotion=(leftFootMotion+rightFootMotion)/2;
    return {hipMotion,leftFootMotion,rightFootMotion,footMotion,totalMotion:hipMotion+footMotion};
  }
  _dominantFoot(m){
    if(m.leftFootMotion<this.cfg.footMovementThreshold && m.rightFootMotion<this.cfg.footMovementThreshold)return null;
    if(m.leftFootMotion>m.rightFootMotion*this.cfg.switchDominance)return 'L';
    if(m.rightFootMotion>m.leftFootMotion*this.cfg.switchDominance)return 'R';
    return null;
  }
}
