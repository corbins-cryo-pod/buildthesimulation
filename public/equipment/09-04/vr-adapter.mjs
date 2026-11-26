// Renderer-independent interface: no Three.js, browser APIs or device input assumptions.
import {acquire,defaults} from './solver.mjs';
export const IDs=Object.freeze({single:['Single_key','Single_key_text','Run_key','Run_key_text'],connect:['Probe_CH1_','Flex_1_'],vertical:['Vertical_scale','Vertical_scale_index'],timebase:['Timebase_scale','Timebase_scale_index'],threshold:['Trigger_level','Trigger_level_index']});
export const labels=Object.freeze({single:'Acquire a single waveform',connect:'Connect or disconnect channel one',vertical:'Vertical volts per division',timebase:'Horizontal seconds per division',threshold:'Trigger threshold in volts'});
export function hitAction(mesh){return Object.keys(IDs).find(id=>IDs[id].some(p=>p.endsWith('_')?mesh.startsWith(p):mesh===p))||null}
export function dispatch(state,action,source=null){
 const s={...defaults,...state};
 if(action.type==='single')return {state:s,record:acquire(s,source)};
 if(action.type==='connect')return {state:{...s,connected:!s.connected},record:null};
 if(action.type==='set')return {state:{...s,[action.parameter]:action.value},record:null};
 if(!['vertical','timebase','threshold'].includes(action.type))throw Error('Unknown instrument action');
 const step=action.direction<0?-1:1;
 if(action.type==='vertical')s.voltsDiv=Math.min(10,Math.max(.000001,s.voltsDiv*2**step));
 if(action.type==='timebase')s.secDiv=Math.min(10,Math.max(.00001,s.secDiv*2**step));
 if(action.type==='threshold')s.level=Math.min(100,Math.max(-100,s.level+step*s.voltsDiv*.25));
 return {state:s,record:null};
}
