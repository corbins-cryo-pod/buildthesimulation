// Framework-independent station state. Works in VR, workers and normal DOM clients.
import {defaults,run} from './solver.mjs';
export const interactionMap=Object.freeze({Front_A_socket:'toggleCable',Input_A_plug:'toggleCable',Front_A_dielectric:'toggleCable',Front_A_contact:'toggleCable',Front_A_barrel:'toggleCable',Front_A_nut:'toggleCable',BNC_plug:'toggleCable',Strain_relief:'toggleCable',Knob_phase:'phase90',phase_cap:'phase90',phase_body:'phase90',phase_index:'phase90',Key_phase_up:'phase90',Key_phase_down:'phaseMinus90',Key_tau_up:'tauUp',Key_tau_down:'tauDown',Key_slope:'cyclePoles',Key_start:'acquire'});
export function createStation(){
 let config={...defaults},input=null,result=null,error=null;
 const read=()=>({config:{...config},input:input?{signalId:input.signalId,contactId:input.contactId,sampleRateHz:input.sampleRateHz,length:input.volts.length}:null,result,error});
 function dispatch(action,arg){
  result=null;error=null;
  if(action==='defaults'){config={...defaults};input=null}
  else if(action==='configure'){for(const [k,v] of Object.entries(arg||{}))if(Object.hasOwn(defaults,k))config[k]=v;}
  else if(action==='loadWaveform'){input=arg;config={...config,source:'import'}}
  else if(action==='toggleCable')config.connected=!config.connected;
  else if(action==='phase90'||action==='phaseMinus90')config.refPhase=(((config.refPhase+(action==='phase90'?90:-90)+180)%360+360)%360)-180;
  else if(action==='tauUp'||action==='tauDown'){const opts=[1,3,10,30,100];config.tauMs=opts[Math.max(0,Math.min(opts.length-1,opts.indexOf(config.tauMs)+(action==='tauUp'?1:-1)))];}
  else if(action==='cyclePoles')config.poles=config.poles%4+1;
  else if(action==='acquire'){const out=run(config,input);result=out.ok?out.result:null;error=out.ok?null:{code:out.code,message:out.message};}
  else throw new Error('Unknown SR860 station action: '+action);
  return read();
 }
 return {read,dispatch,hit:(name)=>interactionMap[name]?dispatch(interactionMap[name]):null};
}
