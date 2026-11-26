// Pure dry geometry and scripted administrative audit. No cleaner operating commands.
export const basketMm=Object.freeze({width:128,depth:112,height:74}),tankMm=Object.freeze({width:150,depth:140,height:100});
export const defaults=()=>({sampleId:'inert-coupon-01',width:100,depth:70,height:25,quarterTurn:false});
export const initial=()=>({configuration:defaults(),lid:false,raised:false,result:null,audit:null,error:'',revision:0});
export function fit(c,revision=0){
 if(typeof c.sampleId!=='string'||!c.sampleId.trim()||c.sampleId.length>96)throw Error('Enter a valid coupon ID.');
 if(![c.width,c.depth,c.height].every(v=>Number.isFinite(v)&&v>0&&v<=180))throw Error('Use positive inert coupon dimensions no greater than 180 mm.');
 const w=c.quarterTurn?c.depth:c.width,d=c.quarterTurn?c.width:c.depth,h=c.height;
 const widthPerSideMm=(basketMm.width-w)/2,depthPerSideMm=(basketMm.depth-d)/2,headroomMm=basketMm.height-h;
 return {schema:'bts.dry-basket-fit.v1',deviceId:'16-10',sampleId:c.sampleId,kind:'simulated',revision:revision+1,parentRevision:revision,configuration:{...c},
  tankMm,basketMm,clearance:{widthPerSideMm,depthPerSideMm,headroomMm,fit:Math.min(widthPerSideMm,depthPerSideMm,headroomMm)>=0},cleanliness:'not evaluated',provenance:'Original 128×112×74 mm basket design; centered dry rigid bounding-box fit.'};
}
export function interruptedAudit(fitResult,revision=0){
 if(!fitResult?.clearance.fit)throw Error('The audit fixture needs a fitting coupon record.');
 let elapsedVirtualS=0,status='ready';const events=[['begin',0],['step',8],['step',12],['interrupt',0]],plannedVirtualS=60,history=[];
 for(const [event,advance] of events){if(event==='begin')status='in-progress';else if(event==='step'&&status==='in-progress')elapsedVirtualS=Math.min(plannedVirtualS,elapsedVirtualS+advance);else if(event==='interrupt'&&status==='in-progress')status='interrupted';history.push({event,elapsedVirtualS,status});}
 return {schema:'bts.dry-basket-audit.v1',deviceId:'16-10',kind:'simulated bookkeeping',sampleId:fitResult.sampleId,revision:revision+1,parentRevision:revision,fitRevision:fitResult.revision,plannedVirtualS,elapsedVirtualS,status,history,completedCycleEntries:[],cleanliness:'not evaluated',physicalCycleRan:false};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='set')return {...s,configuration:{...s.configuration,...p},audit:null,result:null,error:'',revision:p.sampleId!==undefined&&p.sampleId!==s.configuration.sampleId?0:s.revision};
 if(id==='oversize')return act(s,'set',{width:132,depth:70,height:25,quarterTurn:false});
 if(id==='rotate')return act(s,'set',{quarterTurn:!s.configuration.quarterTurn});
 if(id==='lid'){if(s.lid&&s.raised)return {...s,error:'Lower the basket before replacing the lid.'};return {...s,lid:!s.lid,error:''}}
 if(id==='basket'){if(!s.lid)return {...s,error:'Remove the dry lid before lifting the basket.'};return {...s,raised:!s.raised,error:''}}
 if(id==='example')return act({...initial(),lid:true,raised:true},'fit');
 if(id==='fit'){
   if(!s.lid||!s.raised)return {...s,error:'Remove the lid and lift the dry basket first.'};
   try{const r=fit(s.configuration,s.revision);return {...s,result:r,audit:null,revision:r.revision,error:''};}catch(e){return {...s,result:null,audit:null,error:e.message}}
 }
 if(id==='audit'){try{const audit=interruptedAudit(s.result,s.revision);return {...s,audit,revision:audit.revision,error:''};}catch(e){return {...s,audit:null,error:e.message}}}
 throw Error('Unknown dry basket action');
}
