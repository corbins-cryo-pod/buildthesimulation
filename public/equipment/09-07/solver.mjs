export const MODEL='09-07 E4980A ideal passive fixture v1';
export const DEFAULT_GRID=[100,1000,10000,100000];
const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const err=(code,message)=>({ok:false,code,message});
const plus=([r,x],[s,y])=>[r+s,x+y];
const sub=([r,x],[s,y])=>[r-s,x-y];
const inv=([r,x])=>{const d=r*r+x*x;return d>1e-30?[r/d,-x/d]:null;};
const w=f=>2*Math.PI*f;
export const baseFixture=()=>({seriesOhm:15,shuntPf:110});
export const baseDut=()=>({id:'CAL-C1000PF',topology:'series-rc',resistanceOhm:27,capacitancePf:1000});
export const initial=()=>({powered:true,standard:'open',cal:{open:null,short:null},fixture:baseFixture(),dut:baseDut(),voltsRms:.2,grid:[...DEFAULT_GRID],corrected:false,mode:'series',revision:0});
export function specimenZ(f,d) {
 if(d.topology==='r')return [d.resistanceOhm,0];
 const c=d.capacitancePf*1e-12;
 if(d.topology==='series-rc')return [d.resistanceOhm,-1/(w(f)*c)];
 return inv([1/d.resistanceOhm,w(f)*c]);
}
export function rawZ(f,fixture,specimen,d) {
 const s=[fixture.seriesOhm,0],y=[0,w(f)*fixture.shuntPf*1e-12];
 if(specimen==='short') return s;
 if(specimen==='open') {const z=inv(y);return z?plus(s,z):null;}
 const total=inv(plus(y,inv(specimenZ(f,d))));
 return total?plus(s,total):null;
}
export function correctedZ(z,zOpen,zShort) {
 if(!z)return null;
 const y=inv(sub(z,zShort)),ys=zOpen?inv(sub(zOpen,zShort)):[0,0];
 return y&&ys?inv(sub(y,ys)):null;
}
function equivalents(z,f) {
 if(z===null)return null;
 const [r,x]=z,y=inv(z);
 return {realOhm:r,imagOhm:x,magnitudeOhm:Math.hypot(r,x),phaseDeg:Math.atan2(x,r)*180/Math.PI,
         seriesResistanceOhm:r,seriesCapacitancePf:x< -1e-12?-1e12/(w(f)*x):null,
         parallelResistanceOhm:y&&y[0]>1e-15?1/y[0]:null,parallelCapacitancePf:y&&y[1]>1e-15?1e12*y[1]/w(f):null};
}
const sameKey=(s,c)=>c&&s.grid.join(',')===c.grid.join(',')&&s.fixture.seriesOhm===c.fixture.seriesOhm&&s.fixture.shuntPf===c.fixture.shuntPf;
function calibrate(s) {
 if(!['open','short'].includes(s.standard))return err('mount-standard','Mount OPEN or SHORT before storing a standard.');
 return {ok:true,state:{...s,revision:s.revision+1,cal:{...s.cal,[s.standard]:{grid:[...s.grid],fixture:{...s.fixture},revision:s.revision+1,points:s.grid.map(f=>rawZ(f,s.fixture,s.standard,s.dut))}}}};
}
export function measure(s) {
 if(!s.powered)return err('standby','Power on the virtual meter.');
 if(s.standard!=='dut')return err('mount-dut','Mount the passive DUT first.');
 const fresh=sameKey(s,s.cal.open)&&sameKey(s,s.cal.short);
 if(s.corrected&&!fresh)return err('calibration-required','Store OPEN and SHORT for the current fixture and frequency grid before using correction.');
 const rows=s.grid.map((f,i)=>{
   const raw=rawZ(f,s.fixture,'dut',s.dut),out=s.corrected?correctedZ(raw,s.cal.open.points[i],s.cal.short.points[i]):raw;
   return {frequencyHz:f,raw:equivalents(raw,f),impedance:equivalents(out,f),idealDutCurrentRmsA: s.voltsRms/Math.hypot(...specimenZ(f,s.dut)),fixtureInputCurrentRmsA:s.voltsRms/Math.hypot(...raw)};
 });
 if(rows.some(r=>!r.impedance))return err('singular','The ideal correction was numerically singular for one grid point.');
 const result={schema:'bts.impedance-sweep.v1',source:'09-07 Keysight E4980A',sampleId:s.dut.id,revision:s.revision+1,kind:'simulated',model:MODEL,
  phasor:'exp(+jωt), R + jX in Ω',voltsRms:s.voltsRms,mode:s.mode,corrected:s.corrected,dut:{...s.dut},fixture:{...s.fixture},
  correction:fresh?{openRevision:s.cal.open.revision,shortRevision:s.cal.short.revision,openOhm:s.cal.open.points,shortOhm:s.cal.short.points}:null,rows};
 return {ok:true,state:{...s,revision:s.revision+1},result};
}
export function dispatch(s,action,value) {
 if(action==='power')return {ok:true,state:{...s,powered:!s.powered}};
 if(action==='reset')return {ok:true,state:{...initial(),revision:s.revision}};
 if(!s.powered)return err('standby','Power on the virtual meter.');
 switch(action) {
  case 'trigger':return s.standard==='dut'?measure(s):calibrate(s);
  case 'cycle-mode':return dispatch(s,'set-mode',s.mode==='series'?'parallel':'series');
  case 'cycle-mount':return dispatch(s,'mount',{open:'short',short:'dut',dut:'open'}[s.standard]);
  case 'mount':
     if(!['open','short','dut'].includes(value))return err('mount','Select OPEN, SHORT or DUT.');
     return {ok:true,state:{...s,standard:value}};
  case 'record-standard':return calibrate(s);
  case 'measure':return measure(s);
  case 'toggle-correction':return {ok:true,state:{...s,corrected:!s.corrected}};
  case 'set-mode':return ['series','parallel'].includes(value)?{ok:true,state:{...s,mode:value}}:err('mode','Choose series or parallel display.');
  case 'test-voltage':return finite(value,.05,1)?{ok:true,state:{...s,voltsRms:value}}:err('voltage','Use 0.05–1.00 V RMS in this teaching bench.');
  case 'fixture':{
    const f={...s.fixture,...value};
    if(!finite(f.seriesOhm,0,25)||!finite(f.shuntPf,0,1000))return err('fixture','Fixture range is 0–25 Ω series residual and 0–1000 pF shunt.');
    return {ok:true,state:{...s,fixture:f,...((f.seriesOhm!==s.fixture.seriesOhm||f.shuntPf!==s.fixture.shuntPf)?{cal:{open:null,short:null}}:{})}};
   }
  case 'dut':{
    const d={...s.dut,...value},min=d.topology==='series-rc'?0:1;
    if(typeof d.id!=='string'||!/^[a-zA-Z0-9_.-]{1,48}$/.test(d.id)||!['r','series-rc','parallel-rc'].includes(d.topology)||!finite(d.resistanceOhm,min,1e6)||!finite(d.capacitancePf,10,1e6))return err('dut','Valid DUT: short alphanumeric ID, passive topology, resistance 1 Ω–1 MΩ (series ESR may be zero), capacitance 10 pF–1 µF.');
    return {ok:true,state:{...s,dut:d}};
   }
  case 'grid':{
    if(!Array.isArray(value)||value.length<1||value.length>32||value.some((f,i)=>!finite(f,100,200000)||(i>0&&f<=value[i-1])))return err('grid','Use 1–32 increasing positive frequencies between 100 Hz and 200 kHz.');
    return {ok:true,state:{...s,grid:[...value],...(value.join(',')!==s.grid.join(',')?{cal:{open:null,short:null}}:{})}};
   }
  default:return err('action','Unknown action.');
 }
}
export function toCsv(result) {
 return 'frequency_Hz,raw_real_ohm,raw_imag_ohm,reported_real_ohm,reported_imag_ohm,magnitude_ohm,phase_deg,series_capacitance_pF,parallel_capacitance_pF\n'+result.rows.map(({frequencyHz,raw:a,impedance:b})=>[frequencyHz,a.realOhm,a.imagOhm,b.realOhm,b.imagOhm,b.magnitudeOhm,b.phaseDeg,b.seriesCapacitancePf??'',b.parallelCapacitancePf??''].join(',')).join('\n')+'\n';
}
