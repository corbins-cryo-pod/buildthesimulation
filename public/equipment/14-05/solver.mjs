// Quasi-static inert elastic half-space teaching model. All computation uses SI.
export const SITES=Object.freeze([{id:'A',xMm:-2,yMm:.7,reducedPa:12000},{id:'B',xMm:2,yMm:-.7,reducedPa:48000}]);
export const ORACLE=Object.freeze({radiusM:25e-6,stiffnessNPerM:.5,maxIndentM:1.5e-6,sampleThicknessM:.002,contactTravelM:0});
const req=(c,m)=>{if(!c)throw Error(m)},num=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export const hertz=(E,r,d)=>(4/3)*E*Math.sqrt(r)*Math.pow(d,1.5);
function calibration(c){
 req(num(c?.radiusM,3e-6,250e-6)&&num(c?.stiffnessNPerM,.02,200),'Use probe radius 3–250 µm and spring calibration 0.02–200 N/m.');
 req(num(c.sampleThicknessM,1e-6,.1)&&num(c.contactTravelM,-.001,.001),'Sample thickness and contact zero must be finite.');return c;
}
function domain(c,d){
 req(d<=.1*c.radiusM,'Hertz guard: indentation exceeds 10% of tip radius.');
 req(c.sampleThicknessM>=10*Math.sqrt(c.radiusM*d),'Hertz guard: sample thickness is below 10 contact radii.');
}
export function synthetic(site,{maxIndentM=ORACLE.maxIndentM}={}){
 const c=ORACLE;req(num(site?.reducedPa,1,1e9)&&num(maxIndentM,.01e-6,90e-6),'Choose a known inert site and indentation within the model actuator span.');domain(c,maxIndentM);
 return Array.from({length:48},(_,i)=>{const h=i/47*maxIndentM,F=hertz(site.reducedPa,c.radiusM,h),bendM=F/c.stiffnessNPerM;return {travelM:c.contactTravelM+h+bendM,bendM}});
}
export function recover(rows,c){
 calibration(c);req(Array.isArray(rows)&&rows.length>=3&&rows.length<=256,'Use 3–256 calibrated trace rows.');
 const r=rows.map(o=>{
  req(num(o.travelM,-.001,.001)&&num(o.bendM,0,30e-6),'Stage travel or cantilever bending outside teaching range.');
  const indentationM=o.travelM-c.contactTravelM-o.bendM;req(indentationM>=0,'A datum or bending reading places the point before contact.');
  domain(c,indentationM);return {...o,indentationM,forceN:c.stiffnessNPerM*o.bendM,contactRadiusM:Math.sqrt(c.radiusM*indentationM),x:(4/3)*Math.sqrt(c.radiusM)*Math.pow(indentationM,1.5)};
 });
 const ss=r.reduce((a,v)=>a+v.x*v.x,0);req(ss>0,'At least one point must follow the specified contact zero.');
 const apparentReducedPa=r.reduce((a,v)=>a+v.x*v.forceN,0)/ss;req(Number.isFinite(apparentReducedPa)&&apparentReducedPa>0,'No positive stiffness can be fit.');
 const residualRmsN=Math.sqrt(r.reduce((a,v)=>a+(v.forceN-apparentReducedPa*v.x)**2,0)/r.length);
 return {apparentReducedPa,residualRmsN,trace:r.map(({x,...v})=>({...v,fitForceN:apparentReducedPa*x}))};
}
export function state(){return {loaded:true,approached:false,site:0,maxIndentM:1.5e-6,calibration:{...ORACLE},map:[],result:null}}
export function act(s,a,p){
 s.result=null;
 if(a==='load'){req(!s.approached,'Retract the probe before exchanging the fixture.');s.loaded=!s.loaded;s.map=[];return;}
 if(a==='approach'){req(s.loaded,'Load the inert calibration fixture first.');s.approached=!s.approached;return;}
 if(a==='site'){req(!s.approached,'Retract before moving the XY stage.');req([0,1].includes(p),'Select site A or B.');s.site=p;return;}
 if(a==='set'){s.calibration={...s.calibration,...p};s.map=[];return;}
 if(a==='depth'){s.maxIndentM=p;s.map=[];return;}
 if(a==='acquire'||a==='map'){
   req(s.loaded,'Load the inert calibration fixture first.');
   req(a==='map'?!s.approached:s.approached,a==='map'?'Retract before the two-site sequence.':'Approach the selected site first.');
   const q=(site)=>({siteId:site.id,coordinatesMm:{x:site.xMm,y:site.yMm},knownReducedPa:site.reducedPa,...recover(synthetic(site,s),s.calibration)});
   const selected=a==='map'?SITES.map(q):[q(SITES[s.site])],full=[...s.map.filter(x=>!selected.some(v=>v.siteId===x.siteId)),...selected].sort((x,y)=>x.siteId.localeCompare(y.siteId));
   s.map=full;if(a==='map')s.site=1;
   s.result={schema:'bts.indentation-map.v1',deviceId:'14-05',sampleId:'PIUMA-INERT-REF',revision:1,parentRevision:0,units:{position:'mm',force:'N',depth:'m',modulus:'Pa'},assumedProbe:{...s.calibration},fixtureProbe:{...ORACLE},sites:full,provenance:{kind:'simulated',contact:'ideal frictionless isotropic Hertz sphere, elastic half-space; contact zero supplied'}};
   return s.result;
 }
 throw Error('Unknown station action.');
}
export function csv(r){req(r,'No map to export.');return 'site,x_mm,y_mm,apparent_Estar_Pa,travel_m,bend_m,indentation_m,force_N,fitForce_N\n'+r.sites.flatMap(s=>s.trace.map(t=>[s.siteId,s.coordinatesMm.x,s.coordinatesMm.y,s.apparentReducedPa,t.travelM,t.bendM,t.indentationM,t.forceN,t.fitForceN].join(','))).join('\n')+'\n';}
