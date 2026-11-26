export const limits=Object.freeze({radiusMm:[2,15],couponThicknessUm:[25,350],lengthMm:[10,60],widthMm:[.1,4],sheetOhm:[.01,100],cycles:[1,10000],referenceLife:[1,10000000],exponent:[1,8],driftAtLimit:[0,4],frequencyHz:[.1,5],injectedOpen:[0,10000]});
export const defaults=Object.freeze({radiusMm:4.95,couponThicknessUm:100,lengthMm:20,widthMm:1,sheetOhm:.5,cycles:120,referenceLife:1000,exponent:2,driftAtLimit:.5,frequencyHz:2,injectedOpen:100});
export const specimen=Object.freeze({sampleId:'BTS-14-10-SYN-001',sampleRevision:'coupon-r1',contactIds:Object.freeze(['J1','J2']),kind:'synthetic-surface-trace'});
export const checkpointSchema='bts.flex-fatigue.checkpoint.v1', resultSchema='bts.flex-fatigue.history.v1';
export function configure(values) {
  if (!values || typeof values!=='object') throw Error('Missing sample and schedule.');
  const v={};
  for(const [k,[lo,hi]] of Object.entries(limits)){
    const value=values[k]; if(!Number.isFinite(value)||value<lo||value>hi||(['cycles','referenceLife','injectedOpen'].includes(k)&&!Number.isInteger(value))) throw Error(k+' must be '+lo+'–'+hi+'.');
    v[k]=value;
  }
  const radiusNeutralM=(v.radiusMm+v.couponThicknessUm/2000)/1000, arcLengthMm=Math.PI/2*radiusNeutralM*1000;
  if(arcLengthMm>v.lengthMm) throw Error('Trace is too short for a 90° wrap on this mandrel.');
  if(v.injectedOpen>v.cycles) throw Error('Injected cycle must lie within the schedule (0 disables it).');
  const peakStrain=(v.couponThicknessUm/2000)/(v.radiusMm+v.couponThicknessUm/2000);
  if(peakStrain>.03) throw Error('Peak strain exceeds the 3% teaching-model limit.');
  return {values:v,radiusNeutralM,peakStrain,baselineOhm:v.sheetOhm*v.lengthMm/v.widthMm,damagePerCycle:(peakStrain/.01)**v.exponent/v.referenceLife};
}
export function createJob(values=defaults){ const settings=Object.freeze(configure(values).values); return {settings,revision:0,resumedAt:null,history:[],events:[]}; }
export function advance(job,toCycle) {
  const {settings}=job, {radiusNeutralM,peakStrain,baselineOhm,damagePerCycle}=configure(settings);
  if(!Number.isInteger(toCycle)||toCycle<job.history.length||toCycle>settings.cycles) throw Error('Destination is outside the remaining schedule.');
  if(toCycle===job.history.length) return job;
  const history=job.history.slice(),events=job.events.slice();
  for(let cycle=history.length+1;cycle<=toCycle;cycle++){
    const damage=cycle*damagePerCycle;
    if(!events.length&&(cycle===settings.injectedOpen||damage>=1-8*Number.EPSILON)) events.push({cycle,timeS:cycle/settings.frequencyHz,type:'open',reason:cycle===settings.injectedOpen?'synthetic-injection':'synthetic-law-threshold',contactIds:[...specimen.contactIds]});
    history.push({cycle,timeS:cycle/settings.frequencyHz,peakCurvaturePerM:1/radiusNeutralM,peakStrain,damage,flatResistanceOhm:events.length?null:baselineOhm*(1+settings.driftAtLimit*damage),continuity:events.length?'open':'closed'});
  }
  return {...job,history,events,revision:job.revision+1};
}
export function checkpoint(job) {
  return {schema:checkpointSchema,sample:specimen,settings:job.settings,completedCycles:job.history.length,revision:job.revision};
}
export function resumeCheckpoint(data) {
  if(data?.schema!==checkpointSchema||!data.sample||data.sample.sampleId!==specimen.sampleId||data.sample.sampleRevision!==specimen.sampleRevision||data.sample.kind!==specimen.kind||JSON.stringify(data.sample.contactIds)!==JSON.stringify(specimen.contactIds)||!Number.isSafeInteger(data.revision)||data.revision<0||data.revision>1000000000||!Number.isInteger(data.completedCycles)||data.completedCycles<0||(data.completedCycles>0&&data.revision===0)) throw Error('Invalid or incompatible 14-10 checkpoint.');
  const job=advance(createJob(data.settings),data.completedCycles);
  return {...job,revision:data.revision+1,resumedAt:data.completedCycles};
}
export function result(job){
  return {schema:resultSchema,deviceId:'14-10',origin:'synthetic-model',sample:specimen,settings:job.settings,completedCycles:job.history.length,revision:job.revision,resumedAtCycle:job.resumedAt,units:{timeS:'s',peakCurvaturePerM:'m^-1',peakStrain:'1',damage:'1',flatResistanceOhm:'ohm'},samplePhases:{curvature:'90 degree crest',resistance:'returned flat at cycle end'},events:job.events,rows:job.history};
}
export function csv(job){
  const header='sample_id,sample_revision,contact_1,contact_2,job_revision,cycle,time_s,peak_curvature_m^-1,peak_strain_1,damage_1,flat_resistance_ohm,continuity';
  return [header,...job.history.map(r=>[specimen.sampleId,specimen.sampleRevision,...specimen.contactIds,job.revision,r.cycle,r.timeS,r.peakCurvaturePerM,r.peakStrain,r.damage,r.flatResistanceOhm??'',r.continuity].join(','))].join('\n')+'\n';
}
// Pure actions shared by keyboard, DOM controls, desktop picking, and future XR ray picking.
export function action(state,{type,payload}){
  switch(type){
    case 'load': return {job:null,loaded:!state.loaded,armBent:false};
    case 'jog': if(!state.loaded)throw Error('Load the inert trace surrogate first.'); return {...state,armBent:!state.armBent};
    case 'reset': return {job:null,loaded:state.loaded,armBent:false};
    case 'run': if(!state.loaded)throw Error('Load the inert trace surrogate first.'); return {...state,armBent:false,job:advance(state.job??createJob(payload.settings),payload.cycle)};
    case 'resume': return {job:resumeCheckpoint(payload),loaded:true,armBent:false};
    default: throw Error('Unsupported fixture action.');
  }
}
