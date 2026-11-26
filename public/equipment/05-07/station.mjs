// Passive coupon and ideal external SMU; not any real hardware API.
// All values are SI. x right, y away from operator, h up from the sample surface.
// Mirror y -> -Z only when rendering glTF.
export const DEVICE='05-07', METRIC=Object.freeze({travelM:.203,maxThetaRad:5.7*Math.PI/180,chuckDiameterM:.2,loadExtensionM:.235,raisedTipM:.0003,contactGapM:5e-8,armRangeM:.005});
const require=(ok,msg)=>{if(!ok)throw Error(msg)},ok=(n,lo,hi)=>Number.isFinite(n)&&n>=lo&&n<=hi,id=x=>typeof x==='string'&&/^[a-zA-Z0-9_.-]{1,80}$/.test(x);
export function fixture(){return {schema:'bts.probe-coupon.v1',sampleId:'coupon-1k-01',revision:0,sizeM:[.008,.006],pads:[{id:'DUT-HI',net:'a',xM:-.0005,yM:0,widthM:.0001,heightM:.0001},{id:'DUT-LO',net:'b',xM:.0005,yM:0,widthM:.0001,heightM:.0001}],resistors:[{id:'R1',a:'a',b:'b',ohm:1000}],provenance:{kind:'synthetic passive test coupon; not machine calibration'}}}
export function baseSweep(){return {voltagesV:[-1,-.8,-.6,-.4,-.2,0,.2,.4,.6,.8,1],currentLimitA:.002,dwellS:.1,source:'Built-in ideal classroom voltage sweep'}}
export function state(){return {coupon:fixture(),stage:{xM:0,yM:0,thetaRad:0},tips:[{id:'HI',xM:-.0005,yM:0,gapM:METRIC.raisedTipM},{id:'LO',xM:.0005,yM:0,gapM:METRIC.raisedTipM}],drawerOpen:false,shieldOpen:false,connected:true,contactOhm:0,sweep:baseSweep(),result:null}}
export function validateCoupon(c){
 require(c?.schema==='bts.probe-coupon.v1'&&id(c.sampleId)&&Number.isSafeInteger(c.revision)&&c.revision>=0&&c.revision<1e9,'Expected bts.probe-coupon.v1, sample ID and revision.');
 require(c.sizeM?.length===2&&c.sizeM.every(v=>ok(v,.001,.025)),'Teaching coupon size must be 1–25 mm per side.');
 require(Array.isArray(c.pads)&&c.pads.length>=2&&c.pads.length<=32&&Array.isArray(c.resistors)&&c.resistors.length<=80,'Use 2–32 rectangular pads and up to 80 resistors.');
 const ids=new Set(),nodes=new Set();
 for(const p of c.pads){
  require(id(p.id)&&id(p.net)&&!ids.has(p.id)&&ok(p.widthM,.00002,.002)&&ok(p.heightM,.00002,.002)&&ok(Math.abs(p.xM)+p.widthM/2,0,c.sizeM[0]/2)&&ok(Math.abs(p.yM)+p.heightM/2,0,c.sizeM[1]/2),'Pad identifiers or rectangular extents invalid.');ids.add(p.id);nodes.add(p.net);
 }
 for(let i=0;i<c.pads.length;i++)for(let j=i+1;j<c.pads.length;j++){
  const a=c.pads[i],b=c.pads[j];require(Math.abs(a.xM-b.xM)>(a.widthM+b.widthM)/2||Math.abs(a.yM-b.yM)>(a.heightM+b.heightM)/2,'Pad rectangles must remain disjoint; touching shapes are ambiguous.');
 }
 for(const e of c.resistors){require(id(e.id)&&id(e.a)&&id(e.b)&&e.a!==e.b&&!ids.has(e.id)&&ok(e.ohm,1,1e8),'Require finite passive resistors and unique element IDs.');ids.add(e.id);nodes.add(e.a);nodes.add(e.b)}
 require(nodes.size<=32,'Use at most 32 electrical nodes.');return c;
}
export function toWorld(p,t){
 const cos=Math.cos(t.thetaRad),sin=Math.sin(t.thetaRad);return {xM:t.xM+cos*p.xM-sin*p.yM,yM:t.yM+sin*p.xM+cos*p.yM};
}
export function toLocal(p,t){
 const x=p.xM-t.xM,y=p.yM-t.yM,c=Math.cos(t.thetaRad),s=Math.sin(t.thetaRad);return {xM:c*x+s*y,yM:-s*x+c*y};
}
export function blankTips(s){return s.tips.every(t=>t.gapM>METRIC.contactGapM)}
export function pick(t,s){
 const p=toLocal(t,s.stage);
 const hits=(s.coupon?.pads??[]).filter(pad=>Math.abs(p.xM-pad.xM)<=pad.widthM/2+1e-14&&Math.abs(p.yM-pad.yM)<=pad.heightM/2+1e-14);
 const status=!s.coupon?'no-coupon':s.drawerOpen?'load-position':t.gapM>METRIC.contactGapM?'raised-tip':hits.length===1?'contact':'missed-pad';
 return {tipId:t.id,status,die:p,padId:status==='contact'?hits[0].id:null,net:status==='contact'?hits[0].net:null,gapM:t.gapM};
}
export function solveResistance(c,high,low){
 if(high===low)return 0;
 const edges=c.resistors,visited=new Set([high]);let stack=[high];
 while(stack.length){const a=stack.pop();for(const e of edges){const n=e.a===a?e.b:e.b===a?e.a:undefined;if(n&&!visited.has(n)){visited.add(n);stack.push(n)}}}
 if(!visited.has(low))return null;
 const interior=[...visited].filter(x=>x!==high&&x!==low),N=interior.length,idx=new Map(interior.map((x,i)=>[x,i])),A=Array.from({length:N},()=>Array(N+1).fill(0));
 for(const e of edges){const g=1/e.ohm;for(const [a,b] of [[e.a,e.b],[e.b,e.a]]){
   if(!idx.has(a))continue;const i=idx.get(a);A[i][i]+=g;if(b===high)A[i][N]+=g;else if(idx.has(b))A[i][idx.get(b)]-=g;
 }}
 for(let k=0;k<N;k++){
  let r=k;for(let j=k+1;j<N;j++)if(Math.abs(A[j][k])>Math.abs(A[r][k]))r=j;
  require(Math.abs(A[r][k])>1e-14,'Conductance matrix is ill-conditioned.');
  [A[k],A[r]]=[A[r],A[k]];const v=A[k][k];for(let j=k;j<=N;j++)A[k][j]/=v;
  for(let i=0;i<N;i++)if(i!==k){const a=A[i][k];for(let j=k;j<=N;j++)A[i][j]-=a*A[k][j]}
 }
 const V=x=>x===high?1:x===low?0:A[idx.get(x)]?.[N],I=edges.reduce((sum,e)=>{const n=e.a===high?e.b:e.b===high?e.a:undefined;return n===undefined?sum:sum+(1-V(n))/e.ohm},0);
 require(Number.isFinite(I)&&I>0,'Unable to resolve a valid resistance.');return 1/I;
}
export function validateSweep(w){
 require(Array.isArray(w?.voltagesV)&&w.voltagesV.length>=2&&w.voltagesV.length<=201&&w.voltagesV.every(v=>ok(v,-2,2)),'Choose 2–201 points within ±2 V.');
 require(ok(w.currentLimitA,.000001,.005)&&ok(w.dwellS,.001,10),'Require 1 µA–5 mA limit and 1 ms–10 s dwell.');
 return w;
}
export function configureSMU(d,sample){
 require(d?.schema==='bts.smu-resistive-sweep.v1'&&d.configuration?.mode==='V'&&d.configuration.sense===2&&d.deviceId==='09-03','Expected a two-terminal 09-03 SourceMeter voltage-sweep JSON.');
 require(d.sampleId===sample.sampleId&&d.contacts?.length===2&&d.contacts.every((id)=>sample.pads.some(p=>p.id===id)),'SourceMeter sample ID or contact IDs do not match this coupon.');
 require(Number.isSafeInteger(d.revision)&&d.revision>=0&&d.revision<1e9,'Upstream SourceMeter revision invalid.');
 const w=validateSweep({voltagesV:d.points?.map(p=>p.request),currentLimitA:d.configuration.limit,dwellS:d.configuration.dwellS,source:'09-03: voltage requests only, not replayed measured currents',upstream:{sampleId:d.sampleId,revision:d.revision,deviceId:d.deviceId,contactIds:[...d.contacts]}});
 return w;
}
export function acquire(s){
 require(s.connected,'External source meter disconnected. Connect HI/LO measurement leads.');
 require(s.coupon&&!s.drawerOpen,'Insert the loaded wafer drawer before acquiring.');
 require(!s.shieldOpen,'Close the front access shield before acquiring.');
 require(ok(s.contactOhm,0,100),'Contact resistance must be within 0–100 Ω per tip.');
 const w=validateSweep(s.sweep),contact=s.tips.map(t=>pick(t,s)),good=contact.every(t=>t.status==='contact');
 if(good&&w.upstream)require(contact.every((t,i)=>t.padId===w.upstream.contactIds[i]),'Align HI/LO to the selected upstream contact IDs.');
 const dut=good?solveResistance(s.coupon,contact[0].net,contact[1].net):null,terminal=dut===null?null:dut+2*s.contactOhm;
 const topology=!good?'open-contact':dut===null?'open-netlist':terminal===0?'short':'conducting';
 const rows=w.voltagesV.map((v,i)=>{
  const noLimit=terminal===null||v===0?0:terminal===0?Math.sign(v)*Infinity:v/terminal;
  const compliance=Math.abs(noLimit)>w.currentLimitA*(1+8*Number.EPSILON),I=compliance?Math.sign(v)*w.currentLimitA:noLimit;
  return {i,timeS:i*w.dwellS,requestedV:v,terminalV:compliance?I*terminal:v,currentA:I,dutV:dut===null?null:I*dut,compliance};
 });
 return {schema:'bts.probe-contact-sweep.v1',deviceId:DEVICE,sampleId:s.coupon.sampleId,parentRevision:s.coupon.revision,revision:s.coupon.revision+1,contacts:contact,stage:{...s.stage},topology,dutOhm:dut,terminalOhm:terminal,continuity:terminal!==null&&terminal<=50,rows,units:{length:'m',timeS:'s',terminalV:'V',currentA:'A',dutOhm:'ohm'},provenance:{type:'simulated',source:w.source,coupon:s.coupon.provenance??null,upstream:w.upstream??null,warning:'Constant ohmic contacts; no leakage, semiconductor physics or real instrument behavior.'}};
}
export function act(s,a,v){
 s.result=null;
 if(a==='shield'){require(!s.drawerOpen,'Insert the drawer before closing the shield.');s.shieldOpen=!s.shieldOpen;return;}
 if(a==='drawer'){require(s.shieldOpen&&blankTips(s),'Open the shield and raise both tips first.');s.drawerOpen=!s.drawerOpen;return}
 if(a==='load'){require(s.drawerOpen&&blankTips(s),'Open the shield and extend the drawer before loading.');const a=v===null?null:validateCoupon(v);s.coupon=a;s.stage={xM:0,yM:0,thetaRad:0};s.sweep=baseSweep();return}
 if(a==='stage'){require(blankTips(s)&&!s.drawerOpen,'Raise both tips and insert the drawer before moving stage.');require(ok(v.xM,-.1015,.1015)&&ok(v.yM,-.1015,.1015)&&ok(v.thetaRad,-METRIC.maxThetaRad,METRIC.maxThetaRad),'Stage exceeds 203 mm X/Y or ±5.7° theta.');s.stage={...v};return}
 if(a==='tip'){const t=s.tips[v?.index];require(t&&!s.drawerOpen,'Insert the drawer before positioning probes.');require(ok(v.xM,-METRIC.armRangeM,METRIC.armRangeM)&&ok(v.yM,-METRIC.armRangeM,METRIC.armRangeM)&&ok(v.gapM,0,.005),'Tip pose outside teaching range.');require(t.gapM>METRIC.contactGapM||v.xM===t.xM&&v.yM===t.yM,'Raise this probe before moving it laterally.');Object.assign(t,{xM:v.xM,yM:v.yM,gapM:v.gapM});return}
 if(a==='smu'){require(s.coupon,'Load a compatible coupon first.');s.sweep=configureSMU(v,s.coupon);return}
 if(a==='sweep'){s.sweep=validateSweep(v);return}
 if(a==='connect'){s.connected=!s.connected;return}
 if(a==='contactOhm'){s.contactOhm=v;return}
 if(a==='run'){s.result=acquire(s);return s.result}
 throw Error('Unsupported fixture action.');
}
export function csv(r){require(r,'No sweep to export.');return ['# sampleId: '+r.sampleId,'# revision: '+r.revision,'# contactHI: '+(r.contacts[0].padId??'open'),'# contactLO: '+(r.contacts[1].padId??'open'),'# topology: '+r.topology,'time_s,terminal_V,current_A,requested_V,compliance',...r.rows.map(p=>[p.timeS,p.terminalV,p.currentA,p.requestedV,p.compliance].join(','))].join('\n')+'\n'}
export function waveform(r){require(r,'No sweep to export.');return {schema:'bts.analog-waveform.v1',sampleId:r.sampleId,parentRevision:r.parentRevision,revision:r.revision,t0S:0,dtS:r.rows[1].timeS,channels:[{id:'HI-LO',unit:'V',samples:r.rows.map(p=>p.terminalV)}],provenance:{deviceId:DEVICE,type:'simulated settled DC voltage points; no transients',contacts:r.contacts,topology:r.topology,upstream:r.provenance.upstream}}}
