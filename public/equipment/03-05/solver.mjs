// De-energized visual model; checks an independent, original dry alignment fixture only.
export const GAUGE_DIAMETER_MM=112;
export const defaults=()=>({dummyId:'dry-disc-01',diameterMm:100,offsetXmm:3,offsetZmm:4});
export const initial=()=>({configuration:defaults(),positioned:false,result:null,error:'',revision:0});
const inR=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function fit(c,rev=0){
 if(typeof c.dummyId!=='string'||!c.dummyId.trim()||c.dummyId.length>96)throw Error('Provide an inert disc identifier.');
 if(!inR(c.diameterMm,50,140)||!inR(c.offsetXmm,-25,25)||!inR(c.offsetZmm,-25,25))throw Error('Choose a 50–140 mm disc and offsets within ±25 mm.');
 const offsetMm=Math.hypot(c.offsetXmm,c.offsetZmm),marginMm=(GAUGE_DIAMETER_MM-c.diameterMm)/2-offsetMm;
 return {schema:'bts.dry-dummy-fit.v1',kind:'simulated geometry',deviceId:'03-05',fixtureId:'s100-external-witness-gauge',dummyId:c.dummyId,revision:rev+1,parentRevision:rev,configuration:{...c},gaugeDiameterMm:GAUGE_DIAMETER_MM,offsetMm,marginMm,fits:marginMm>=0,cabinetState:'de-energized visual only',resultScope:'Centered circular planar containment; no machine access or material change. The gauge is an original model.'};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='set')return {...s,configuration:{...s.configuration,...p},result:null,error:'',revision:p.dummyId!==undefined&&p.dummyId!==s.configuration.dummyId?0:s.revision};
 if(id==='offset')return act(s,'set',{offsetXmm:6,offsetZmm:8});
 if(id==='place')return {...s,positioned:!s.positioned,result:null,error:''};
 if(id==='example')return act({...initial(),positioned:true,revision:s.configuration.dummyId===defaults().dummyId?s.revision:0},'check');
 if(id==='check'){if(!s.positioned)return {...s,result:null,error:'Position an inert dummy on the external gauge first.'};
  try{const r=fit(s.configuration,s.revision);return {...s,result:r,revision:r.revision,error:''};}catch(e){return {...s,result:null,error:e.message};}}
 throw Error('Unknown dry alignment action');
}
