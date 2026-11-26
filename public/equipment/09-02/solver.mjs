// Low-energy pedagogic operating-point model, not a Keysight measurement driver.
export const fixtureSchema = 'bts.two-terminal-fixture.v1';
export const resultSchema = 'bts.parametric-sweep.v1';
export const limits = Object.freeze({ voltageV: 1, complianceMinA: 1e-6, complianceMaxA: .002, minOhm:100, maxOhm:100000, minF:1e-10, maxF:1e-8, minHz:1000, maxHz:100000, minRmsV:.01,maxRmsV:.05,minSteps:3,maxSteps:81 });
const modes = {IV:'B1517A HRSMU',CV:'B1520A MFCMU'};
const fail = (code,message) => ({ok:false,code,message});
const valid = (x,min,max) => typeof x==='number' && Number.isFinite(x) && x>=min && x<=max;
const id = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(x);
export function preset(kind='resistor',value) {
 const resistor=kind==='resistor';
 return { schema:fixtureSchema, kind, sampleId:resistor?'R-CAL-1K':'C-CAL-1NF',revision:1, contacts:[{id:'PAD_A',role:'HI'},{id:'PAD_B',role:'LO'}], value:value??(resistor?1000:1e-9),unit:resistor?'ohm':'F', provenance:'Ideal BuildTheSimulation passive coupon' };
}
export function initial() {
 return {mode:'IV',power:true,wired:true,probeDown:true,fixture:preset(),startV:-.4,stopV:.4,points:9,complianceA:.00025,frequencyHz:10000,signalVrms:.03,sequence:0};
}
export function parseFixture(raw) {
 if (!raw || raw.schema!==fixtureSchema || !id(raw.sampleId) || !Number.isInteger(raw.revision) || raw.revision<1 || raw.revision>1e8 || !['resistor','capacitor'].includes(raw.kind)) return fail('fixture','Choose a supported resistor or capacitor coupon JSON with a sample ID and revision.');
 if (!Array.isArray(raw.contacts) || raw.contacts.length!==2 || raw.contacts.some(p=>!p || !id(p.id)) || raw.contacts[0].id===raw.contacts[1].id || new Set(raw.contacts.map(c=>c.role)).size!==2 || !raw.contacts.every(c=>['HI','LO'].includes(c.role))) return fail('contacts','A coupon must have two unique contact IDs mapped to HI and LO.');
 if (raw.kind==='resistor' && (raw.unit!=='ohm' || !valid(raw.value,limits.minOhm,limits.maxOhm))) return fail('value','Resistor coupon value must be 100 Ω to 100 kΩ in ohms.');
 if (raw.kind==='capacitor' && (raw.unit!=='F' || !valid(raw.value,limits.minF,limits.maxF))) return fail('value','Capacitor coupon value must be 100 pF to 10 nF in farads.');
 return {ok:true,fixture:{schema:raw.schema,kind:raw.kind,sampleId:raw.sampleId,revision:raw.revision,contacts:raw.contacts.map(c=>({id:c.id,role:c.role})),value:raw.value,unit:raw.unit,provenance:typeof raw.provenance==='string'?raw.provenance.slice(0,180):'Imported coupon'}};
}
export function dispatch(s,action,arg) {
 if(action==='power')return {ok:true,state:{...s,power:!s.power}};
 if(action==='wire')return {ok:true,state:{...s,wired:!s.wired,probeDown:false}};
 if(action==='seat')return s.wired?{ok:true,state:{...s,probeDown:!s.probeDown}}:fail('not-wired','Connect the module leads before lowering the probes.');
 if(action==='mode')return Object.hasOwn(modes,arg)?{ok:true,state:{...s,mode:arg,wired:false,probeDown:false}}:fail('mode','Choose HRSMU I–V or MFCMU C–V.');
 if(action==='swap-coupon'){
  const fixture=preset(s.mode==='IV'?'resistor':'capacitor');
  return {ok:true,state:{...s,fixture,probeDown:false}};
 }
 if(action==='import'){
  const p=parseFixture(arg);return p.ok?{ok:true,state:{...s,fixture:p.fixture,probeDown:false}}:p;
 }
 if(action==='settings') {
  const {startV,stopV,points,complianceA,frequencyHz,signalVrms,value}=arg??{};
  const fixture={...s.fixture};
  if(value!==fixture.value){if(!Number.isFinite(value))return fail('value','Enter a finite fixture value.');fixture.value=value;fixture.revision++;}
  return {ok:true,state:{...s,startV,stopV,points,complianceA,frequencyHz,signalVrms,fixture}};
 }
 if(action==='run')return measure(s);
 return fail('action','Unknown instrument action.');
}
export function measure(s) {
 if(!s.power)return fail('standby','Press the standby button to power on the simulator.');
 if(!Object.hasOwn(modes,s.mode))return fail('mode','Select an installed module.');
 if(!s.wired)return fail('not-wired','Connect the selected module leads to the fixture before measuring.');
 if(!s.probeDown)return fail('probe-open','Lower both probes onto the coupon pads before measuring.');
 const p=parseFixture(s.fixture);if(!p.ok)return p;
 const f=p.fixture,isIV=s.mode==='IV';
 if(isIV ? f.kind!=='resistor' : f.kind!=='capacitor')return fail('fixture-mode',isIV?'Install a supported resistor coupon for this HRSMU I–V exercise.':'Install an ideal capacitor coupon for this MFCMU C–V exercise.');
 if(!valid(s.startV,-1,1)||!valid(s.stopV,-1,1)||s.stopV===s.startV||!Number.isInteger(s.points)||!valid(s.points,3,81))return fail('sweep','Enter different start and stop values between −1 and +1 V, plus 3–81 integer points.');
 if(isIV&&!valid(s.complianceA,limits.complianceMinA,limits.complianceMaxA))return fail('compliance','Set absolute current compliance between 1 µA and 2 mA.');
 if(!isIV&&(!valid(s.frequencyHz,limits.minHz,limits.maxHz)||!valid(s.signalVrms,limits.minRmsV,limits.maxRmsV)))return fail('ac-signal','Set 1–100 kHz and 10–50 mV RMS for the supported C–V model.');
 const seq=s.sequence+1,n=s.points;
 const settings=isIV?{startV:s.startV,stopV:s.stopV,points:n,complianceA:s.complianceA}:{startV:s.startV,stopV:s.stopV,points:n,frequencyHz:s.frequencyHz,signalVrms:s.signalVrms};
 const Y=isIV?0:2*Math.PI*s.frequencyHz*f.value;
 const points=Array.from({length:n},(_,i)=>{
  const commandV=i===0?s.startV:i===n-1?s.stopV:s.startV+(s.stopV-s.startV)*(i/(n-1));
  if(!isIV)return {index:i,commandV,terminalV:commandV,capacitanceF:f.value,susceptanceS:Y,acCurrentArms:Y*s.signalVrms,phaseDegrees:90,dcCurrentA:0,flag:'OK'};
  const requestedA=commandV/f.value,clipped=Math.abs(requestedA)-s.complianceA>1e-15;
  const currentA=clipped?Math.sign(requestedA)*s.complianceA:requestedA;
  return {index:i,commandV,terminalV:clipped?currentA*f.value:commandV,currentA,flag:clipped?'COMPLIANCE':'OK'};
 });
 const complianceCount=points.filter(p=>p.flag==='COMPLIANCE').length;
 return {ok:true,state:{...s,sequence:seq},result:{schema:resultSchema,mode:s.mode,classification:'simulated',instrument:'Keysight B1500A',module:modes[s.mode],sampleId:f.sampleId,sampleRevision:f.revision,parent:f,measurementId:`${f.sampleId}-${s.mode}-${seq}`,revision:seq,contacts:{HI:f.contacts.find(c=>c.role==='HI').id,LO:f.contacts.find(c=>c.role==='LO').id},signConvention:'V = HI − LO and positive I enters HI. Row order is programmed bias sequence, not time.',units:isIV?{commandV:'V',terminalV:'V',currentA:'A'}:{commandV:'V',terminalV:'V',capacitanceF:'F',susceptanceS:'S',acCurrentArms:'A RMS',dcCurrentA:'A',phaseDegrees:'deg'},model:isIV?'ideal resistor + ideal symmetric source current limit':'ideal C, DC leakage = 0, parallel C/G model',settings,complianceCount,summary:isIV?`${complianceCount} of ${n} points limited`:`${(f.value*1e9).toPrecision(4)} nF at each bias`,points}};
}
export function toCsv(r) {
 const fields=r.mode==='IV'?['index','commandV','terminalV','currentA','flag']:['index','commandV','terminalV','capacitanceF','susceptanceS','acCurrentArms','phaseDegrees','dcCurrentA','flag'];
 return ['sampleId,sampleRevision,measurementId,measurementRevision,classification,module,contactHI,contactLO,'+fields.join(','),...r.points.map(p=>[r.sampleId,r.sampleRevision,r.measurementId,r.revision,r.classification,r.module,r.contacts.HI,r.contacts.LO,...fields.map(k=>p[k])].join(','))].join('\n')+'\n';
}
