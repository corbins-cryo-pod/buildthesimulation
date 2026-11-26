// Reusable SI-domain state and action API. No real motion control and no vendor firmware.
export const CAL='BTS-CDE178-JANDEL-1MM-r1',PITCH=.001,FINF=Math.PI/Math.LN2;
export const constants=Object.freeze({pitchM:PITCH,maxCurrentA:.01,minCurrentA:.000001,maxSenseV:1,minDiskDiameterM:.0508,maxDiskDiameterM:.2032,loadLiftM:.007,lidTravelRad:1.7});
const TAU=2*Math.PI;
function req(ok,message){if(!ok)throw Error(message)}
const good=(x,lo,hi)=>Number.isFinite(x)&&x>=lo&&x<=hi;
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_.-]{1,64}$/.test(x);
const compact=Math.hypot;
const coord=(x,y)=>({xM:x,yM:y});
export function film(){return {schema:'bts.sheet-film.v1',sampleId:'FILM-100R',revision:0,shape:'uniform-disk',diameterM:.1,resistivityOhmM:2e-6,filmThicknessM:20e-9,provenance:{kind:'synthetic',note:'Uniform 100 Ω/sq teaching artifact on insulating substrate; not an SRM.'}}}
export function validateFilm(f){
 req(f&&f.schema==='bts.sheet-film.v1'&&id(f.sampleId)&&Number.isSafeInteger(f.revision)&&f.revision>=0&&f.revision<1e8,'Expected bts.sheet-film.v1 with an alphanumeric sample ID and revision.');
 req(f.shape==='uniform-disk','Only uniform circular films on an insulating substrate are modeled.');
 req(good(f.diameterM,constants.minDiskDiameterM,constants.maxDiskDiameterM),'Round wafer diameter must be 50.8–203.2 mm.');
 req(good(f.resistivityOhmM,1e-12,1e4)&&good(f.filmThicknessM,1e-9,.0001),'Require finite resistivity (Ω·m) and film thickness 1 nm–100 µm (≤0.1 pitch).');
 req(good(f.resistivityOhmM/f.filmThicknessM,1e-3,1e7),'Film resistance outside the supported 0.001–10,000,000 Ω/sq range.');
 return {...f};
}
export function tips(site,angle){
 req(good(Math.hypot(site?.xM,site?.yM),0,.102)&&good(angle,-TAU,TAU),'Invalid wafer coordinate or probe azimuth.');
 return [-1.5,-.5,.5,1.5].map((d,i)=>({id:'P'+(i+1),xM:site.xM+d*PITCH*Math.cos(angle),yM:site.yM+d*PITCH*Math.sin(angle),role:i===0?'force+':i===3?'force−':i===1?'sense+':'sense−'}));
}
function imageTerm(p,q,r2){return compact(1-(p.xM*q.xM+p.yM*q.yM)/r2,(p.xM*q.yM-p.yM*q.xM)/r2)}
export function geometry(diameter,site,angle,mode='disk'){
 req(good(diameter,constants.minDiskDiameterM,constants.maxDiskDiameterM),'Unsupported disk diameter.');
 req(mode==='disk'||mode==='infinite','Unknown geometric boundary.');
 const p=tips(site,angle),R=diameter/2;
 p.forEach(({id,xM,yM})=>req(compact(xM,yM)<=R-.0002,id+' falls outside the usable film (0.2 mm teaching guard).'));
 const [p1,p2,p3,p4]=p,g=(a,b)=>imageTerm(a,b,R*R);
 // 2D insulated disk with a source and sink. Quadratic Neumann Green terms cancel.
 const outer=mode==='infinite'?0:Math.log(g(p2,p4)*g(p3,p1)/(g(p2,p1)*g(p3,p4)));
 const F=TAU/(2*Math.LN2+outer);
 return {boundary:mode,contactIds:p.map(x=>x.id),tips:p,fOhmsPerOhm:F,edgeMultiplier:F/FINF,clearanceM:R-Math.max(...p.map(x=>compact(x.xM,x.yM)))};
}
export function measurement(f,site,angle,{currentA=.001,offsetV=0,boundary='disk',reversePair=true}={}){
 f=validateFilm(f);req(good(Math.abs(currentA),constants.minCurrentA,constants.maxCurrentA),'Current magnitude must be 1 µA–10 mA (teaching limit).');
 req(good(offsetV,-.01,.01),'Sense offset must be within ±10 mV (teaching limit).');
 const g=geometry(f.diameterM,site,angle,boundary),r0=f.resistivityOhmM/f.filmThicknessM;
 const voltageV=currentA*r0/g.fOhmsPerOhm+offsetV,reversedVoltageV=reversePair?-currentA*r0/g.fOhmsPerOhm+offsetV:null;
 req(Math.abs(voltageV)<=constants.maxSenseV&&(!reversePair||Math.abs(reversedVoltageV)<=constants.maxSenseV),'Sense input overload at ±1 V. Reduce virtual drive current.');
 const oddV=reversePair?(voltageV-reversedVoltageV)/2:voltageV;
 return {site,...g,currentA,voltageV,reversedVoltageV,oddV,estimatedOffsetV:reversePair?(voltageV+reversedVoltageV)/2:null,apparentInfiniteOhmSq:FINF*oddV/currentA,sheetOhmSq:g.fOhmsPerOhm*oddV/currentA};
}
export function inferVoltageMap(input){
 req(input?.schema==='bts.sheet-voltage-map.v1'&&id(input.sampleId)&&Number.isSafeInteger(input.revision)&&input.revision>=0&&input.revision<1e8&&Array.isArray(input.sites)&&input.sites.length>=1&&input.sites.length<=49,'Expected a voltage-map revision containing 1–49 sites.');
 const seen=new Set();
 const rows=input.sites.map(row=>{
  const {siteId,xM,yM,angleRad,currentA,voltageV,reversedVoltageV=null}=row;
  req(id(siteId)&&!seen.has(siteId),'Site IDs must be valid and unique.');seen.add(siteId);
  req(good(Math.abs(currentA),constants.minCurrentA,constants.maxCurrentA)&&good(voltageV,-1,1)&&(reversedVoltageV===null||good(reversedVoltageV,-1,1)),'Imported amperes/volts are out of range.');
  const site=coord(xM,yM),g=geometry(input.diameterM,site,angleRad,'disk'),oddV=reversedVoltageV===null?voltageV:(voltageV-reversedVoltageV)/2;
  req(oddV/currentA>0,'Opposite-sign or zero inferred resistance. Check sense/drive polarity and input units.');
  return {siteId,site,angleRad,...g,currentA,voltageV,reversedVoltageV,oddV,estimatedOffsetV:reversedVoltageV===null?null:(voltageV+reversedVoltageV)/2,apparentInfiniteOhmSq:FINF*oddV/currentA,sheetOhmSq:g.fOhmsPerOhm*oddV/currentA};
 });return wrap(input,input.diameterM,rows,'inferred from supplied terminal voltages; source origin not independently verified');
}
function wrap(sample,diameterM,rows,kind){
 return {schema:'bts.sheet-map.v1',deviceId:'05-06',sampleId:sample.sampleId,parentRevision:sample.revision,revision:sample.revision+1,calibrationId:CAL,diameterM,coordinates:{length:'m',x:'+right',y:'+away from operator',origin:'wafer center',angle:'counterclockwise from +x'},units:{sheet:'ohm/sq',voltage:'V',current:'A'},rows,provenance:{kind,method:'Insulated homogeneous 2D sheet, NBS TN 199 geometry; ideal readout. Imported voltage maps are effective estimates, not inverse material reconstruction.',source:sample.provenance??null}}
}
export function state(){return {film:film(),lidOpen:true,headDown:false,site:coord(0,0),angleRad:0,currentA:.001,offsetV:.0005,reversePair:true,boundary:'disk',result:null,row:0}}
export function plan(s,recipe='spot'){
 req(s.film,'Load a virtual specimen.');
 if(recipe==='spot')return [s.site];
 req(recipe==='ring'||recipe==='edge','Unknown site recipe.');
 if(recipe==='edge')return [0,.25,.50,.68,.81,.90,.94].map(f=>coord(f*s.film.diameterM/2,0));
 return [coord(0,0),...Array.from({length:8},(_,i)=>{const a=i*TAU/8,r=s.film.diameterM*.45;return coord(r*Math.cos(a),r*Math.sin(a))})];
}
export function act(s,a,value){
 s.result=null;
 if(a==='lid'){req(!s.headDown,'Raise the probe before opening lid.');s.lidOpen=!s.lidOpen;return;}
 if(a==='head'){req(!s.lidOpen&&s.film,'Close the lid on a loaded specimen before contacting.');s.headDown=!s.headDown;return;}
 if(a==='load'){req(s.lidOpen&&!s.headDown,'Open lid and retract head before loading.');const f=value===null?null:validateFilm(value);s.film=f;s.site=coord(0,0);return;}
 if(a==='move'||a==='angle'){req(!s.headDown,'Raise the probe before moving the stage.');const site=a==='move'?value:s.site,angle=a==='angle'?value:s.angleRad;tips(site,angle);s.site={...site};s.angleRad=angle;return;}
 if(['currentA','offsetV','reversePair','boundary'].includes(a)){s[a]=value;return;}
 if(a==='infer'){req(!s.headDown,'Raise probe before entering offline voltage-map review.');s.result=inferVoltageMap(value);s.row=0;return s.result;}
 if(a==='run'){
  req(!s.lidOpen&&s.headDown&&s.film,'Load specimen, close shield and lower probe before acquiring.');
  req(value===undefined||value==='spot','Use Load/scan for a multi-site recipe.');
  s.result=wrap(s.film,s.film.diameterM,[{siteId:'S01',angleRad:s.angleRad,...measurement(s.film,s.site,s.angleRad,s)}],'simulated');s.row=0;return s.result;
 }
 if(a==='scan'){
  req(!s.lidOpen&&!s.headDown&&s.film,'Load specimen, close shield and raise probe before starting an automatic scan.');
  const sites=plan(s,value),rows=sites.map((site,i)=>({siteId:'S'+String(i+1).padStart(2,'0'),angleRad:s.angleRad,...measurement(s.film,site,s.angleRad,s)}));
  s.site={...sites.at(-1)};s.result=wrap(s.film,s.film.diameterM,rows,'simulated');s.row=0;return s.result;
 }
 throw Error('Unknown station action.');
}
export function sheetCSV(r){if(!r)throw Error('No acquisition.');const keys=['siteId','x_m','y_m','angle_rad','I_A','V_V','V_reversed_V','V_odd_V','F_ohm_per_ohm','edge_multiplier','Rsheet_ohm_sq','apparent_infinite_ohm_sq'];return ['# sampleId: '+r.sampleId,'# parentRevision: '+r.parentRevision,'# revision: '+r.revision,'# calibrationId: '+r.calibrationId,keys.join(','),...r.rows.map(v=>[v.siteId,v.site.xM,v.site.yM,v.angleRad,v.currentA,v.voltageV,v.reversedVoltageV??'',v.oddV,v.fOhmsPerOhm,v.edgeMultiplier,v.sheetOhmSq,v.apparentInfiniteOhmSq].join(','))].join('\n')+'\n';}
