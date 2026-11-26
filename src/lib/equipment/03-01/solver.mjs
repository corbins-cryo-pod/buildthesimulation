// Passive fit and independent geometric optics worksheet for an inert witness.
export const POCKET_DIAMETER_MM=104, GRID_MM=.025, EDGE_HEIGHT_MM=.1,ACTIONS=Object.freeze([0,45,60]);
export const defaults=()=>({sampleId:'inert-disc-01',diameterMm:100,pocket:1,angleDeg:45});
export const initial=()=>({configuration:defaults(),open:false,seated:false,result:null,error:'',revision:0});
const range=(v,l,h)=>Number.isFinite(v)&&v>=l&&v<=h;
export function check(c){
 if(typeof c.sampleId!=='string'||!c.sampleId.trim()||c.sampleId.length>96)throw Error('Enter an inert witness ID.');
 if(!range(c.diameterMm,50,120)||!Number.isInteger(c.pocket)||c.pocket<1||c.pocket>6||!ACTIONS.includes(c.angleDeg))throw Error('Choose an offered pocket and an inert disc diameter of 50–120 mm.');
 return {clearanceMm:(POCKET_DIAMETER_MM-c.diameterMm)/2,fits:c.diameterMm<=POCKET_DIAMETER_MM};
}
export function shadow(c,rev=0){
 const fit=check(c);if(!fit.fits)throw Error('The inert disc exceeds the original recess diameter.');
 const rad=c.angleDeg*Math.PI/180,lengthMm=EDGE_HEIGHT_MM*Math.tan(rad),n=16;
 const profile=Array.from({length:n},(_,i)=>{const xMm=(i+.5)*GRID_MM,relativeIllumination=xMm<lengthMm?0:1;return {xMm,relativeIllumination}});
 const count=profile.filter(p=>p.relativeIllumination===0).length;
 return {schema:'bts.ideal-light-shadow.v1',deviceId:'03-01',sampleId:c.sampleId,kind:'simulated geometry',revision:rev+1,parentRevision:rev,pocketId:'P'+c.pocket,
   placement:'seated',diameterMm:c.diameterMm,radialRecessMarginMm:fit.clearanceMm,referenceGeometry:{edgeHeightMm:EDGE_HEIGHT_MM,angleFromNormalDeg:c.angleDeg,lateralGridMm:GRID_MM},
   lightShadow:{analyticalLengthMm:lengthMm,shadowCells:count,rasterLengthMm:count*GRID_MM,profile},
   provenance:'Independent parallel-light geometry worksheet; synthetic dimensionless visibility, not material or thickness data. No tool operation.'};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='cover'){if(s.open&&s.seated)return {...s,error:'Remove the inert witness before replacing the display cover.'};return {...s,open:!s.open,error:''};}
 if(id==='example')return act({...initial(),open:true,seated:true,revision:s.configuration.sampleId===defaults().sampleId?s.revision:0},'read');
 if(id==='set')return {...s,configuration:{...s.configuration,...p},seated:p.diameterMm!==undefined||p.sampleId!==undefined||p.pocket!==undefined?false:s.seated,result:null,error:'',revision:p.sampleId!==undefined&&p.sampleId!==s.configuration.sampleId?0:s.revision};
 if(id==='seat'){if(!s.open)return {...s,error:'Lift the passive display cover first.'};if(s.seated)return {...s,seated:false,result:null,error:''};
   try{if(!check(s.configuration).fits)throw Error('The inert disc exceeds the original recess diameter. It was not seated.');return {...s,seated:true,error:''};}catch(e){return {...s,seated:false,result:null,error:e.message};}}
 if(id==='read'){if(!s.seated)return {...s,error:'Seat a fitting witness before comparing the optical profile.'};try{const r=shadow(s.configuration,s.revision);return {...s,result:r,revision:r.revision,error:''};}catch(e){return {...s,result:null,error:e.message};}}
 throw Error('Unknown passive station action');
}
