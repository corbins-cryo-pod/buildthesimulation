export const table=Object.freeze({lengthMm:1800,widthMm:1200,thicknessMm:203,supportMm:711.2,workingYmm:914.2,borderMm:12.5,pitchMm:25,nx:72,nz:48});
export const ref=Object.freeze({massKg:300,naturalHz:1,zeta:1/6});
export const preset=Object.freeze({schema:'bts.optical-table-input.v1',sampleId:'two-hole-inert-witness',revision:1,ix:32,iz:35,spacingMm:50,xShiftMm:0,zShiftMm:0,frequencyHz:5,baseUm:10,addedKg:0});
const inRange=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function hole(ix,iz){
 if(!Number.isInteger(ix)||ix<0||ix>=table.nx||!Number.isInteger(iz)||iz<0||iz>=table.nz)throw Error('Requested hole runs beyond the tabletop grid.');
 return {id:'X'+ix+'-Z'+iz,ix,iz,xMm:-table.lengthMm/2+table.borderMm+ix*table.pitchMm,yMm:0,zMm:-table.widthMm/2+table.borderMm+iz*table.pitchMm};
}
export function snap(ix,iz,spacingMm){
 if(!inRange(spacingMm,25,150))throw Error('First-pass fixture spacing is 25–150 mm.');
 const n=Math.round(spacingMm/table.pitchMm);
 if(Math.abs(spacingMm-n*table.pitchMm)>.05+1e-12)throw Error('Mount rejected: spacing is not a multiple of the 25 mm grid within 0.05 mm.');
 const a=hole(ix,iz),b=hole(ix+n,iz);
 return {occupied:[a,b],localMm:[(a.xMm+b.xMm)/2,0,a.zMm],separationMm:n*table.pitchMm,spacingResidualMm:spacingMm-n*table.pitchMm};
}
export function transfer(frequencyHz,addedKg=0){
 if(!inRange(frequencyHz,0,25)||!inRange(addedKg,0,100))throw Error('Use 0–25 Hz and an added centered mass of 0–100 kg.');
 const m=ref.massKg+addedKg,k=ref.massKg*(2*Math.PI*ref.naturalHz)**2,c=2*ref.zeta*Math.sqrt(k*ref.massKg),naturalHz=Math.sqrt(k/m)/(2*Math.PI),zeta=c/(2*Math.sqrt(k*m)),r=frequencyHz/naturalHz;
 const a=2*zeta*r,b=1-r*r,mag=Math.hypot(1,a)/Math.hypot(b,a);
 return {massKg:m,kNPerM:k,cNsPerM:c,naturalHz,zeta,crossoverHz:Math.SQRT2*naturalHz,ratio:mag,gainDb:20*Math.log10(mag),phaseDeg:(Math.atan2(a,1)-Math.atan2(a,b))*180/Math.PI};
}
export function validate(x){
 if(x?.schema!=='bts.optical-table-input.v1'||typeof x.sampleId!=='string'||!/^[a-z0-9_-]{1,60}$/i.test(x.sampleId)||!Number.isInteger(x.revision)||x.revision<1||x.revision>1e6||!Number.isInteger(x.ix)||!Number.isInteger(x.iz))throw Error('Invalid optical table input fixture, identifier, revision or hole indices.');
 hole(x.ix,x.iz);
 if(!inRange(x.spacingMm,25,150)||!inRange(x.xShiftMm,-500,500)||!inRange(x.zShiftMm,-500,500)||!inRange(x.baseUm,0,100)||!inRange(x.frequencyHz,0,25)||!inRange(x.addedKg,0,100))throw Error('Use 25–150 mm spacing, ±500 mm table motion, 0–100 µm base amplitude, 0–25 Hz, and 0–100 kg centered mass.');
 return Object.fromEntries(Object.keys(preset).map(k=>[k,x[k]]));
}
export function output(settings=preset,fit=null,sequence=1){
 const x=validate(settings),t=transfer(x.frequencyHz,x.addedKg),origin=[x.xShiftMm,table.workingYmm,x.zShiftMm];
 return {schema:'bts.optical-table-output.v1',equipmentId:'16-01',sampleId:x.sampleId,revision:x.revision,runSequence:sequence,provenance:'Analytic passive rigid-body vertical model; modal reference anchored to catalog nominal 1 Hz/10 dB; synthetic base tone.',
 coordinates:{axes:'right-handed +Y up, +Z front',units:'mm',tableOriginWorldMm:origin,fixtureOriginWorldMm:fit?.localMm.map((v,i)=>v+origin[i])??null,fixtureOriginTableMm:fit?.localMm??null,fixtureQuaternionXYZW:fit?[0,0,0,1]:null,occupied:fit?.occupied.map(q=>({...q,worldMm:[q.xMm+origin[0],q.yMm+origin[1],q.zMm+origin[2]]}))??[]},
 excitation:{frequencyHz:x.frequencyHz,basePeakUm:x.baseUm,addedCenteredMassKg:x.addedKg},response:{...t,tablePeakUm:x.baseUm*t.ratio,fixturePeakUm:fit?x.baseUm*t.ratio:null}};
}
export const initial=()=>({settings:{...preset},fit:snap(preset.ix,preset.iz,preset.spacingMm),sequence:0,measured:null});
export function dispatch(s,a,v){
 try{
  if(a==='reset')return {ok:true,state:initial(),message:'Restored the aligned two-hole example.'};
  if(a==='import'||a==='settings'){
   const settings=validate(a==='import'?v:{...s.settings,...v});
   const changed=a==='import'||['ix','iz','spacingMm'].some(k=>settings[k]!==s.settings[k]);
   return {ok:true,state:{...s,settings,fit:changed?null:s.fit,measured:null},message:changed?'Fixture parameters changed; snap the mount again.':'Input applied.'};
  }
  if(a==='shift')return dispatch(s,'settings',{xShiftMm:s.settings.xShiftMm===0?250:0,zShiftMm:s.settings.zShiftMm===0?-100:0});
  if(a==='snap'){
   const {ix,iz,spacingMm}=s.settings,fit=snap(ix,iz,spacingMm);
   return {ok:true,state:{...s,fit,measured:null},message:'Mounted to '+fit.occupied.map(q=>q.id).join(' and ')+'.'};
  }
  if(a==='release')return {ok:true,state:{...s,fit:null,measured:null},message:'Fixture removed.'};
  if(a==='load')return dispatch(s,'settings',{addedKg:s.settings.addedKg>0?0:60});
  if(a==='run'){
   const sequence=s.sequence+1,measured=output(s.settings,s.fit,sequence);
   return {ok:true,state:{...s,sequence,measured},message:s.fit?'Computed table and attached fixture response.':'Table response only: no attached fixture.'};
  }
  throw Error('Unknown action.');
 }catch(err){return {ok:false,state:s,message:err.message};}
}
export const sweep=(addedKg=0)=>Array.from({length:251},(_,i)=>({fHz:i/10,...transfer(i/10,addedKg)}));
