// Geometry-only empty-tray gauge. No operational states or hardware actions exist.
export const chamber=Object.freeze({diameterMm:384,interiorDepthMm:760,frontExclusionMm:20,rearExclusionMm:15,centerYmm:-47.5});
export const defaults=()=>({trayId:'empty-carrier-01',widthMm:286,depthMm:675,heightMm:25});
export const initial=()=>({configuration:defaults(),result:null,section:false,error:'',revision:0});
const inR=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
export function check(c,revision=0){
 if(typeof c.trayId!=='string'||!c.trayId.trim()||c.trayId.length>96)throw Error('An empty carrier ID is required.');
 if(!inR(c.widthMm,1,500)||!inR(c.heightMm,1,150)||!inR(c.depthMm,1,900))throw Error('Use modeled ranges: width 1–500, height 1–150 and depth 1–900 mm.');
 if(!Number.isSafeInteger(revision)||revision<0)throw Error('Invalid result revision.');
 const farY=Math.abs(chamber.centerYmm)+c.heightMm/2,outerRadiusMm=Math.hypot(c.widthMm/2,farY),apertureMarginMm=chamber.diameterMm/2-outerRadiusMm;
 const availableDepthMm=chamber.interiorDepthMm-chamber.frontExclusionMm-chamber.rearExclusionMm,doorPlaneMarginMm=availableDepthMm-c.depthMm;
 const clearance={outerRadiusMm,availableDepthMm,apertureMarginMm,doorPlaneMarginMm,fits:apertureMarginMm>=0&&doorPlaneMarginMm>=0};
 return {schema:'bts.empty-tray-clearance.v1',deviceId:'16-05',trayId:c.trayId,revision:revision+1,parentRevision:revision,kind:'simulated geometry',input:{...c},chamber:{...chamber},clearance,loadedContentsModeled:false,operatingState:'not modeled',geometryProvenance:'Legacy 3870EA brochure nominal chamber; centered empty carrier at an original guide offset and assumed depth exclusion planes. No sweep, tolerance or fit certification.'};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='section')return {...s,section:!s.section,error:''};
 if(id==='set')return {...s,configuration:{...s.configuration,...p},result:null,error:'',revision:p.trayId!==undefined&&p.trayId!==s.configuration.trayId?0:s.revision};
 if(id==='oversized')return act(s,'set',{depthMm:736});
 if(id==='example')return act({...s,configuration:defaults(),section:true,revision:s.configuration.trayId===defaults().trayId?s.revision:0},'check');
 if(id==='check'){try{const r=check(s.configuration,s.revision);return {...s,section:true,result:r,revision:r.revision,error:''};}
   catch(e){return {...s,result:null,error:e.message};}}
 throw Error('Unknown geometric gauge action');
}
