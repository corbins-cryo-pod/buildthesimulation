// Cold, purely geometric placement. No operating controls, thermal state or treatment physics.
export const shelf=Object.freeze({widthMm:310,depthMm:270,headroomMm:195});
export const defaults=()=>({dummyId:'empty-dry-tray-01',widthMm:250,depthMm:180,heightMm:45,quarterTurn:false});
export const initial=()=>({configuration:defaults(),open:false,result:null,error:'',revision:0});
const ok=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function fit(c,rev=0){
 if(typeof c.dummyId!=='string'||!c.dummyId.trim()||c.dummyId.length>96)throw Error('Enter an inert empty tray ID.');
 if(!ok(c.widthMm,1,480)||!ok(c.depthMm,1,480)||!ok(c.heightMm,1,300))throw Error('Use positive tray dimensions: width/depth 1–480 mm, height 1–300 mm.');
 const width=c.quarterTurn?c.depthMm:c.widthMm,depth=c.quarterTurn?c.widthMm:c.depthMm;
 const widthPerSideMm=(shelf.widthMm-width)/2,depthPerSideMm=(shelf.depthMm-depth)/2,headroomMm=shelf.headroomMm-c.heightMm;
 return {schema:'bts.dry-shelf-fit.v1',deviceId:'03-10',kind:'simulated geometry',dummyId:c.dummyId,revision:rev+1,parentRevision:rev,configuration:{...c},shelf:{...shelf},clearance:{widthPerSideMm,depthPerSideMm,headroomMm,fits:Math.min(widthPerSideMm,depthPerSideMm,headroomMm)>=0},treatment:'not modeled',provenance:'Original stationary empty-tray bounding box; cabinet scale from Dentsply 1750 outline, not manufacturing suitability.'};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='view')return {...s,open:!s.open,error:''};
 if(id==='set')return {...s,configuration:{...s.configuration,...p},result:null,error:'',revision:p.dummyId!==undefined&&p.dummyId!==s.configuration.dummyId?0:s.revision};
 if(id==='rotate')return act(s,'set',{quarterTurn:!s.configuration.quarterTurn});
 if(id==='oversize')return act(s,'set',{widthMm:315,depthMm:180,heightMm:45,quarterTurn:false});
 if(id==='example')return act({...initial(),open:true,revision:s.configuration.dummyId===defaults().dummyId?s.revision:0},'check');
 if(id==='check'){if(!s.open)return {...s,result:null,error:'Show the dry visual cavity before evaluating the tray.'};
  try {const r=fit(s.configuration,s.revision);return {...s,result:r,revision:r.revision,error:''};}catch(e){return {...s,result:null,error:e.message};}}
 throw Error('Unknown dry shelf action');
}
