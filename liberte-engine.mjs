const DEFAULTS = Object.freeze({
  minSamples: 100,              // ~10 s at 10 Hz
  recentWindow: 20,             // ~2 s
  lowVariationThreshold: 0.045, // heuristic, provisional
  repeatedStateRatio: 0.60
});

function finite(values){return values.filter(Number.isFinite)}
function range(values){const a=finite(values);return a.length?Math.max(...a)-Math.min(...a):0}
function median(values){const a=finite(values).sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function quantize(v,step){return Number.isFinite(v)?Math.round(v/step):0}

export class LiberteEngine {
  constructor(options={}){this.cfg={...DEFAULTS,...options};this.reset()}
  reset(){this.samples=[];this.recent=[]}

  ingest(sample){
    if(!sample)return {phase:'waiting',kind:'',symbol:'👀',text:'Repères insuffisants pour observer la variété du mouvement.'};
    this.samples.push(sample);this.recent.push(sample);
    if(this.recent.length>this.cfg.recentWindow)this.recent.shift();
    if(this.samples.length<20)return {phase:'analysis',kind:'',symbol:'✨',text:'Bougez librement. FrameCheck observe seulement la variété visible.'};
    const v=this._windowVariation(this.recent);
    const repeated=this._repeatedRatio(this.recent);
    if(v<this.cfg.lowVariationThreshold){
      return {phase:'analysis',kind:'',symbol:'✨',text:'Peu de variation est visible sur ces dernières secondes. Explorez une autre amplitude ou direction si vous le souhaitez.'};
    }
    if(repeated>=this.cfg.repeatedStateRatio){
      return {phase:'analysis',kind:'',symbol:'🔁',text:'Un motif similaire revient souvent dans les mouvements visibles.'};
    }
    return {phase:'analysis',kind:'good',symbol:'✅',text:'Plusieurs variations de mouvement sont visibles.'};
  }

  summary(){
    const n=this.samples.length;
    if(n<this.cfg.minSamples)return {enough:false,reason:'session_short',sampleCount:n};
    const horizontalRange=range(this.samples.map(s=>s.hipX));
    const verticalRange=range(this.samples.map(s=>s.hipY));
    const rotationRange=range(this.samples.map(s=>s.torsion));
    const armRange=(range(this.samples.map(s=>s.armL))+range(this.samples.map(s=>s.armR)))/2;
    const levelRange=range(this.samples.map(s=>s.hipY));
    const repetition=this._repeatedRatio(this.samples.filter((_,i)=>i%5===0));
    const stateVariety=1-repetition;
    return {
      enough:true,sampleCount:n,horizontalRange,verticalRange,rotationRange,armRange,levelRange,repetition,stateVariety,
      amplitudeLabel:armRange>=0.45?'Variations étendues':armRange>=0.20?'Variations modérées':'Peu de variation',
      displacementLabel:(horizontalRange+verticalRange)>=0.12?'Variations visibles':(horizontalRange+verticalRange)>=0.06?'Quelques variations':'Peu de variation',
      rotationLabel:rotationRange>=25?'Variations visibles':rotationRange>=12?'Quelques variations':'Peu de variation',
      levelLabel:levelRange>=0.08?'Variations visibles':levelRange>=0.035?'Quelques variations':'Peu de variation',
      repetitionLabel:repetition>=0.60?'Motifs souvent répétés':repetition>=0.35?'Quelques motifs répétés':'Variété visible'
    };
  }

  _windowVariation(samples){
    if(samples.length<2)return 0;
    return range(samples.map(s=>s.hipX))+range(samples.map(s=>s.hipY))+0.5*range(samples.map(s=>s.armL))+0.5*range(samples.map(s=>s.armR))+range(samples.map(s=>s.torsion))/90;
  }
  _signature(s){
    return [quantize(s.hipX,0.06),quantize(s.hipY,0.05),quantize(s.armL,0.18),quantize(s.armR,0.18),quantize(s.torsion,12)].join(':');
  }
  _repeatedRatio(samples){
    if(!samples.length)return 1;
    const counts=new Map();
    for(const s of samples){const k=this._signature(s);counts.set(k,(counts.get(k)||0)+1)}
    let max=0;for(const v of counts.values())if(v>max)max=v;
    return max/samples.length;
  }
}
