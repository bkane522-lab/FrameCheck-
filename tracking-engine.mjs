const CORE=[11,12,23,24];
const LEFT_ARM=[11,13,15];
const RIGHT_ARM=[12,14,16];
const LEFT_LEG=[23,25,27,29,31];
const RIGHT_LEG=[24,26,28,30,32];
const FEET=[27,28,31,32];
const BODY_FRAME=[0,11,12,23,24,27,28,31,32];

function clamp(v,min=0,max=1){return Math.max(min,Math.min(max,v))}
function confidence(p){
  if(!p)return 0;
  const visibility=Number.isFinite(p.visibility)?p.visibility:0;
  const presence=Number.isFinite(p.presence)?p.presence:1;
  return Math.min(visibility,presence);
}
function quality(lm,ids,min=0.22){
  if(!lm||!ids.length)return 0;
  let n=0;
  for(const id of ids) if(confidence(lm[id])>=min)n++;
  return n/ids.length;
}
function inFrame(p,margin=0.015){return Boolean(p&&p.x>=margin&&p.x<=1-margin&&p.y>=margin&&p.y<=1-margin)}
function frameRatio(lm,ids,margin=0.015){
  if(!lm||!ids.length)return 0;
  return ids.filter(id=>inFrame(lm[id],margin)).length/ids.length;
}
function dist2(a,b){return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0}
function bodySpan(lm){
  if(!lm)return 0;
  const usable=BODY_FRAME.map(i=>lm[i]).filter(Boolean);
  if(usable.length<4)return 0;
  const ys=usable.map(p=>p.y).filter(Number.isFinite);
  return ys.length?Math.max(...ys)-Math.min(...ys):0;
}
function worldTurn(world,a,b){
  if(!world?.[a]||!world?.[b])return NaN;
  const dx=Math.abs(world[b].x-world[a].x);
  const dz=Math.abs(world[b].z-world[a].z);
  const d=Math.hypot(dx,dz);
  return d?clamp(dz/d):NaN;
}
function imageTurn(lm){
  if(!lm)return 0;
  const shMid={x:(lm[11].x+lm[12].x)/2,y:(lm[11].y+lm[12].y)/2};
  const hpMid={x:(lm[23].x+lm[24].x)/2,y:(lm[23].y+lm[24].y)/2};
  const torso=dist2(shMid,hpMid)||0.001;
  const width=(dist2(lm[11],lm[12])+dist2(lm[23],lm[24]))/2;
  const ratio=width/torso;
  // A narrow shoulder/hip projection generally appears during side views.
  return clamp((0.58-ratio)/0.42);
}
export function orientationScore(lm,world){
  const a=worldTurn(world,11,12),b=worldTurn(world,23,24);
  const w=[a,b].filter(Number.isFinite);
  if(w.length)return clamp(w.reduce((s,v)=>s+v,0)/w.length);
  return imageTurn(lm);
}

export function classifyPose({landmarks:lm,worldLandmarks:world,mode='cadre',preflight=false}={}){
  if(!lm?.length)return {state:'lost',fullBodyReady:false,pivotLike:false,turnScore:0,coreQuality:0,armQuality:0,legQuality:0,frameRatio:0,bodySpan:0};
  const coreQuality=quality(lm,CORE,0.24);
  const leftArmQuality=quality(lm,LEFT_ARM,0.18);
  const rightArmQuality=quality(lm,RIGHT_ARM,0.18);
  const leftLegQuality=quality(lm,LEFT_LEG,0.16);
  const rightLegQuality=quality(lm,RIGHT_LEG,0.16);
  const armQuality=Math.max(leftArmQuality,rightArmQuality);
  const legQuality=Math.max(leftLegQuality,rightLegQuality);
  const bothFeetFrame=frameRatio(lm,FEET,0.01);
  const wholeFrame=frameRatio(lm,BODY_FRAME,0.01);
  const span=bodySpan(lm);
  const turnScore=orientationScore(lm,world);
  const pivotLike=turnScore>=0.48 || Math.abs(leftArmQuality-rightArmQuality)>=0.45 || Math.abs(leftLegQuality-rightLegQuality)>=0.45;

  // Before the countdown we deliberately require a complete framing. This prevents
  // sessions from starting with only the upper body visible.
  const headReady=inFrame(lm[0],0.01) && confidence(lm[0])>=0.20;
  const hipsReady=inFrame(lm[23],0.01)&&inFrame(lm[24],0.01)&&coreQuality>=0.70;
  const feetReady=bothFeetFrame>=0.75 && Math.max(confidence(lm[27]),confidence(lm[28]),confidence(lm[31]),confidence(lm[32]))>=0.18;
  const fullBodyReady=headReady&&hipsReady&&feetReady&&wholeFrame>=0.78&&span>=0.52;

  if(preflight){
    return {state:fullBodyReady?'valid':'partial',fullBodyReady,pivotLike,turnScore,coreQuality,armQuality,legQuality,leftArmQuality,rightArmQuality,leftLegQuality,rightLegQuality,frameRatio:wholeFrame,footFrameRatio:bothFeetFrame,bodySpan:span};
  }

  // During dancing, a pivot may hide one arm or one leg. Do not kill the whole
  // analysis: require the core plus whichever side remains observable.
  const coreMin=pivotLike?0.50:0.62;
  let valid=false;
  if(mode==='cadre') valid=coreQuality>=coreMin && armQuality>=0.48;
  else if(mode==='posture') valid=coreQuality>=coreMin;
  else if(mode==='marche') valid=coreQuality>=(pivotLike?0.50:0.58) && legQuality>=0.42;
  else valid=coreQuality>=(pivotLike?0.50:0.58) && (legQuality>=0.34 || armQuality>=0.42);

  const bodyStillInFrame=wholeFrame>=0.56 || (frameRatio(lm,[0,23,24,27,28],0.01)>=0.60);
  const state=valid&&bodyStillInFrame?'valid':'partial';
  return {state,fullBodyReady,pivotLike,turnScore,coreQuality,armQuality,legQuality,leftArmQuality,rightArmQuality,leftLegQuality,rightLegQuality,frameRatio:wholeFrame,footFrameRatio:bothFeetFrame,bodySpan:span};
}

export function metricConfidence(lm,ids,min=0.18){return quality(lm,ids,min)}
export function pointUsable(lm,id,min=0.18){return confidence(lm?.[id])>=min}
