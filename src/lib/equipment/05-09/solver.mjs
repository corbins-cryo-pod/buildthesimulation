// Educational energy-axis and response fitting. No OEM algorithms, hardware output or chemistry inference.
export const schema='bts.xps-reference-fit.v1';
export const lines={Au:{id:'Au-4f7/2',refEv:83.96},Ag:{id:'Ag-3d5/2',refEv:368.21},Cu:{id:'Cu-2p3/2',refEv:932.62}};
export const defaults=()=>({sampleId:'inert-line-reference-01',passEv:11.75,auArea:1000,agArea:1000,rsfAu:1,rsfAg:1,baseline:0,offsetEv:.3,gainPpm:500,axis:'calibrated'});
export const initial=()=>({config:defaults(),loaded:true,door:false,position:'analysis',result:null,error:'',revision:0});
const need=(b,t)=>{if(!b)throw Error(t)},bounds=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function valid(c){
 need(c&&typeof c.sampleId==='string'&&c.sampleId.trim().length&&c.sampleId.length<=96,'Enter a sample ID of 1–96 characters.');
 need([11.75,23.5,46.95,93.9].includes(c.passEv),'Select a supported pass energy.');
 for(const k of ['auArea','agArea'])need(bounds(c[k],0,100000),'Integrated input areas must be 0–100,000 counts.');
 for(const k of ['rsfAu','rsfAg'])need(bounds(c[k],.05,10),'Relative response factors must be 0.05–10.');
 need(bounds(c.baseline,0,1000),'Background must be 0–1000 counts/eV.');
 need(bounds(c.offsetEv,-3,3)&&bounds(c.gainPpm,-1000,1000),'Offset must be ±3 eV; gain error ±1,000 ppm.');
 need(['calibrated','raw'].includes(c.axis),'Choose raw or calibrated eV.');
}
const trapezoid=(y,h)=>h*y.reduce((a,v,i)=>a+(i===0||i===y.length-1?.5:1)*v,0);
export const resolutionEv=passEv=>Math.hypot(.34,.017*passEv);
export function generate(line,c,area){
 // Evaluate 241 symmetric samples over ±6 eV in reference space. Input areas are integrated detector response, not stoichiometry.
 const gain=1+c.gainPpm*1e-6,center=gain*line.refEv+c.offsetEv,sigma=gain*resolutionEv(c.passEv)/Math.sqrt(8*Math.log(2)),dx=.05*gain,mid=120;
 const rawEv=Array.from({length:241},(_,i)=>center+(i-mid)*dx);
 const g=rawEv.map(e=>Math.exp(-.5*((e-center)/sigma)**2));
 const norm=area/trapezoid(g,dx),countsPerEv=g.map(y=>c.baseline+y*norm);
 return {lineId:line.id,referenceEv:line.refEv,rawEv,countsPerEv};
}
export function fit(w,a=1,b=0){
 const raw=w.rawEv,h=raw[1]-raw[0],y=w.countsPerEv;const baseline=(y[0]+y.at(-1))/2;
 const excess=y.map(x=>Math.max(0,x-baseline)),area=trapezoid(excess,h);
 const energyEv=raw.map(e=>(e-b)/a),densityPerEv=y.map(y=>a*y);
 if(!(area>1e-8))return {lineId:w.lineId,referenceEv:w.referenceEv,rawCenterEv:null,centerEv:null,fwhmEv:null,areaCounts:0,bgCountsPerEv:a*baseline,energyEv,densityPerEv,residualRmsPerEv:null};
 const rawCenterEv=trapezoid(excess.map((v,i)=>raw[i]*v),h)/area;
 const sigma=Math.sqrt(trapezoid(excess.map((v,i)=>(raw[i]-rawCenterEv)**2*v),h)/area);
 const modeled=raw.map(e=>Math.exp(-.5*((e-rawCenterEv)/sigma)**2));const K=area/trapezoid(modeled,h);
 const residualRmsPerEv=a*Math.sqrt(modeled.reduce((z,v,i)=>z+(v*K+baseline-y[i])**2,0)/modeled.length);
 return {lineId:w.lineId,referenceEv:w.referenceEv,rawCenterEv,centerEv:(rawCenterEv-b)/a,fwhmEv:sigma*Math.sqrt(8*Math.log(2))/a,areaCounts:area,bgCountsPerEv:a*baseline,energyEv,densityPerEv,residualRmsPerEv};
}
export function solve(c,revision=0){
 valid(c);need(Number.isSafeInteger(revision)&&revision>=0,'Invalid revision.');
 const [au,cu]=[lines.Au,lines.Cu].map(k=>fit(generate(k,c,5000)).rawCenterEv);
 const gain=(cu-au)/(lines.Cu.refEv-lines.Au.refEv),offsetEv=au-gain*lines.Au.refEv,cal=c.axis==='calibrated';
 const windows=[['Au',c.auArea,c.rsfAu],['Ag',c.agArea,c.rsfAg]].map(([element,area,rsf])=>({...fit(generate(lines[element],c,area),cal?gain:1,cal?offsetEv:0),element,responseFactor:rsf}));
 const correctedTotal=windows.reduce((a,w)=>a+w.areaCounts/w.responseFactor,0);
 for(const w of windows)w.relativePercent=correctedTotal>1e-8?100*(w.areaCounts/w.responseFactor)/correctedTotal:null;
 return {schema,deviceId:'05-09',model:'PHI 5000 VersaProbe II / monochromatic Al Kα',kind:'simulated',sampleId:c.sampleId,inputRevision:revision,revision:revision+1,units:{energy:'eV',density:'counts/eV',area:'counts',relativeFraction:'%' },calibration:{mode:c.axis,anchorLineIds:[lines.Au.id,lines.Cu.id],anchorMeasuredRawEv:[au,cu],fittedOffsetEv:offsetEv,fittedGain:gain-1,equation:'E=(raw-offsetEv)/gain; gain denominator = 1+fittedGain',source:'Distinct synthetic Au and Cu calibration fixtures; Ag window not used to fit affine law.'},configuration:{...c},windows,empty:correctedTotal<=1e-8,percentageInterpretation:'Relative response-corrected synthetic signals, not chemical atomic percentages of a specimen.',provenance:{method:'Gaussian area-normalized isolated reference lines; constant baseline; moment fit; affine calibration',reference:'ISO 15472:2010, table 2, monochromated Al Kα',measuredHardware:false,history:[{deviceId:'05-09',operation:'XPS test fit',parentRevision:revision,resultRevision:revision+1}]}};
}
export function act(s,id,p){
 const idle={...s,result:null,error:''};
 if(id==='reset')return initial();
 if(id==='door'){
  if(s.position==='analysis')return {...s,error:'Retract the virtual transfer assembly before opening the cover.'};
  return {...idle,door:!s.door};
 }
 if(id==='load')return s.door&&s.position==='intro'?{...idle,loaded:!s.loaded}:{...s,error:'Open the cover at intro position first.'};
 if(id==='transfer'){
  if(s.door)return {...s,error:'Close the virtual intro cover before transfer.'};
  return {...idle,position:s.position==='analysis'?'intro':'analysis'};
 }
 if(id==='axis')return {...idle,config:{...s.config,axis:s.config.axis==='calibrated'?'raw':'calibrated'}};
 if(id==='set')return {...idle,config:{...s.config,...p},revision:p.sampleId!==undefined&&p.sampleId!==s.config.sampleId?0:s.revision};
 if(id==='run'){
  try{need(s.loaded,'No coupon loaded.');need(s.position==='analysis'&&!s.door,'Move the coupon to the analysis position first.');
   const result=solve(s.config,s.revision);return {...s,result,error:'',revision:result.revision};
  }catch(e){return {...idle,error:e.message};}
 }
 throw Error('Unknown action');
}
export function csv(r){
 const q=x=>'"'+String(x).replace(/"/g,'""')+'"';
 return ['sampleId,revision,kind,component,axis,eV,counts_per_eV,integral_counts,response_factor,relative_percent',...r.windows.flatMap(w=>w.energyEv.map((e,i)=>[q(r.sampleId),r.revision,r.kind,w.lineId,r.calibration.mode,e,w.densityPerEv[i],w.areaCounts,w.responseFactor,w.relativePercent??''].join(',')))].join('\n')+'\n';
}
