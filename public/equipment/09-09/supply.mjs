// Original ideal, steady-state DC load-line solver; SI volts, amperes, ohms and watts.
// No vendor firmware, control-loop dynamics, protection timing or hardware validation.
export const RAILS=Object.freeze([{id:'CH1',vMax:6,iMax:10},{id:'CH2',vMax:25,iMax:2},{id:'CH3',vMax:25,iMax:2}]);
const die=m=>{throw Error(m)},range=(n,lo,hi,name)=>Number.isFinite(n)&&n>=lo&&n<=hi?n:die(name+' must be between '+lo+' and '+hi);
export function initial(){return {sampleId:'dc-load-bank-001',revision:0,selected:0,channels:RAILS.map((rail,i)=>({id:rail.id,setV:i?12:5,limitA:i?.2:.1,enabled:i===0,connected:i===0,loadOhm:i?1000:100,leadOhm:0,remote:false,senseIntact:true}))}}
export function validate(s){if(!s||typeof s.sampleId!=='string'||!s.sampleId.trim()||s.sampleId.length>150||!Number.isSafeInteger(s.revision)||s.revision<0||s.revision>1e8||!Number.isInteger(s.selected)||s.selected<0||s.selected>2||!Array.isArray(s.channels)||s.channels.length!==3)die('Expected a named sample, a valid revision and three independent channels');
 s.channels.forEach((c,i)=>{if(!c||c.id!==RAILS[i].id)die('Invalid channel ID/order');range(c.setV,0,RAILS[i].vMax,c.id+' voltage (V)');range(c.limitA,0,RAILS[i].iMax,c.id+' current limit (A)');range(c.loadOhm,0,1e7,'Load (Ω)');range(c.leadOhm,0,100,'Loop resistance (Ω)');for(const key of ['enabled','connected','remote','senseIntact'])if(typeof c[key]!=='boolean')die('Invalid '+key)})}
export function rail(c,i){const max=RAILS[i],base={contactId:c.id,loadOhm:c.loadOhm,loopOhm:c.leadOhm,regulation:'',terminalV:0,loadV:0,currentA:0,loadW:0,leadW:0,supplyW:0,meterV:0};
 if(!c.enabled)return {...base,regulation:'OFF',loadV:c.connected?0:null};
 if(c.remote&&(!c.senseIntact||!c.connected))die(c.id+': remote sense circuit open; reconnect sense and load or select local. Physical fallback behavior is not simulated.');
 if(!c.connected)return {...base,regulation:'OPEN / CV',terminalV:c.setV,meterV:c.setV,loadV:null};
 const R=c.loadOhm,L=c.leadOhm,ctrl=c.remote?R:R+L;
 let requested=ctrl>0?c.setV/ctrl:(c.setV>0?Infinity:0);
 let I=Math.min(requested,c.limitA),Vload=I*R,Vout=I*(R+L);
 const mode=Number.isFinite(requested)&&Math.abs(requested-c.limitA)<=1e-12&&c.setV>0?'CV/CC boundary':requested>c.limitA?'CC':'CV';
 // A conservative terminal ceiling (rated output) is used instead of undocumented compliance margin.
 if(c.remote&&((I*L/2)>1+1e-10||Vout>max.vMax+1e-10))die(c.id+': remote compensation exceeds 1 V per equal lead or the modeled rated terminal headroom. Reduce loop resistance or setpoint.');
 return {...base,regulation:mode,terminalV:Vout,loadV:Vload,currentA:I,loadW:I*I*R,leadW:I*I*L,supplyW:Vout*I,meterV:c.remote?Vload:Vout}}
export function run(s){validate(s);let channels=s.channels.map(rail);return {schema:'bts.dc-supply-run.v1',equipmentId:'09-09',model:'Keysight E36313A / USB-LAN, no GPIB',kind:'simulated ideal steady state',sampleId:s.sampleId,parentRevision:s.revision,revision:s.revision+1,units:{voltage:'V',current:'A',resistance:'ohm',power:'W'},input:structuredClone(s),channels,totalW:channels.reduce((n,x)=>n+x.supplyW,0)}}
export function dispatch(s,a){let n=structuredClone(s),c=n.channels[n.selected];switch(a.type){
 case 'select':n.selected=a.channel;break;case 'output':n.channels[a.channel??n.selected].enabled=!n.channels[a.channel??n.selected].enabled;break;case 'all':{let on=!n.channels.every(x=>x.enabled);n.channels.forEach(x=>x.enabled=on);break}
 case 'load':{let d=n.channels[a.channel??n.selected];d.connected=!d.connected;break}
 case 'set':if(!['setV','limitA','loadOhm','leadOhm','enabled','connected','remote','senseIntact'].includes(a.key))die('Invalid control');c[a.key]=a.value;break;
 case 'voltage':c.setV=Math.max(0,Math.min(RAILS[n.selected].vMax,Math.round((c.setV+(a.direction<0?-.1:.1))*1e6)/1e6));break;
 case 'current':c.limitA=Math.max(0,Math.min(RAILS[n.selected].iMax,Math.round((c.limitA+(a.direction<0?-.01:.01))*1e6)/1e6));break;
 default:die('Unknown control')}
 validate(n);return n}
export function hitAction(name){let m=/^Select_([123])(?:_|$)/.exec(name);if(m)return {type:'select',channel:+m[1]-1};m=/^Output_([123])(?:_|$)/.exec(name);if(m)return {type:'output',channel:+m[1]-1};m=/^(?:Post|Cable|Load)_CH([123])(?:_|$)/.exec(name);if(m)return {type:'load',channel:+m[1]-1};if(name.startsWith('Knob_Voltage'))return {type:'voltage'};if(name.startsWith('Knob_Current'))return {type:'current'};if(name.startsWith('All_key'))return {type:'all'};return null}
export const actionLabels={select:'Select output channel',output:'Toggle individual output',all:'Toggle all outputs',load:'Connect/disconnect passive load',voltage:'Adjust selected voltage ±0.1 V',current:'Adjust selected limit ±0.01 A'};
export function sweep(s){validate(s);const i=s.selected,c=s.channels[i];if(!c.enabled||!c.connected)die('Load-step log needs an enabled, connected selected channel');const Rbase=c.loadOhm;if(Rbase<=0)die('Load-step log requires a nonzero starting resistance');let samples=[],stages=[];for(const [t,k] of [[0,1],[5,.1],[10,1]]){let st=structuredClone(s);st.channels[i].loadOhm=Rbase*k;let v=run(st).channels[i];stages.push({startS:t,loadOhm:st.channels[i].loadOhm,loadV:v.loadV,currentA:v.currentA,mode:v.regulation})}for(let n=0;n<=160;n++)samples.push(stages[n<50?0:n<100?1:2].loadV);
return {schema:'bts.analog-waveform.v1',sampleId:s.sampleId,revision:s.revision+1,dtS:.1,startS:0,kind:'simulated quasi-static DC load sequence',source:'09-09 E36313A passive load-step fixture',channels:[{id:c.id+'_LOAD-HI_to_LOAD-LO',unit:'V',samples}],provenance:{equipmentId:'09-09',parentRevision:s.revision,operation:'steady-state plateaus R → 0.1R → R at 5 s and 10 s; sample grid is synthetic, not a measured transient',stages,sourceSettings:structuredClone(c)}}}
export function csv(r){const q=n=>'"'+String(n).replaceAll('"','""')+'"';return '# sampleId: '+r.sampleId.replace(/[\r\n]/g,' ')+'\n# revision: '+r.revision+'\n# kind: '+r.kind+'\ncontactId,mode,terminal_V,load_V,current_A,supply_W,load_W,loop_W\n'+r.channels.map(c=>[q(c.contactId),q(c.regulation),c.terminalV,c.loadV??'',c.currentA,c.supplyW,c.loadW,c.leadW].join(',')).join('\n')+'\n'}
export function parseWiring(x){if(x?.schema!=='bts.dc-load-bank.v1'||!x.state)die('Expected bts.dc-load-bank.v1 with state and three labelled loads');validate(x.state);return structuredClone(x.state)}
