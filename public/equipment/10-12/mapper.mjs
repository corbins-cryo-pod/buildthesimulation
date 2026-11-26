// Passive voltage placeholders; synthetic, not recorded signals or electrode maps.
export const IDS=['A1','A2','A3','B1','B2','B3'],N=500,BASE_HZ=500,DT=1/BASE_HZ;
export const sampleIds=Object.fromEntries(IDS.map(id=>[id,'EMPTY-DUMMY-'+id]));
export const positions=Object.fromEntries(IDS.map((id,i)=>[id,[i<3?-20.4:20.4,[37.7,0,-37.7][i%3]]]));
export const points=Array.from({length:9},(_,i)=>({id:'P'+(i+1),xMm:(i%3-1)*1.35,zMm:(Math.floor(i/3)-1)*.72}));
export const interactions={Drawer_face_select:{action:'drawer',label:'Open or close virtual reference drawer'},...Object.fromEntries(IDS.flatMap(id=>[['Well_'+id,{action:'select',wellId:id,label:'Inspect empty well '+id}],['Inert_target_'+id,{action:'select',wellId:id,label:'Inspect empty well '+id}]]))};
export const initial=()=>({drawerOut:false,well:'A1',point:'P5',active:false});
export function reduce(s,a,id){if(a==='drawer')return {...s,drawerOut:!s.drawerOut};if(a==='select'){if(!IDS.includes(id))throw Error('Unknown placeholder well.');return {...s,well:id,active:true}}if(a==='point'){if(!points.some(p=>p.id===id))throw Error('Unknown synthetic point.');return {...s,point:id}}if(a==='inspect')return {...s,active:true};if(a==='unload')return {...s,active:false};throw Error('Unknown view action')}
const centers=[80,238,421];
export function read(s){if(!s.active)return null;const point=points.find(p=>p.id===s.point);if(!point||!IDS.includes(s.well))throw Error('Invalid placeholder.');const amp=s.well==='A1'?(.012+.008*Math.exp(-Math.hypot(point.xMm,point.zMm))):0;const v=Array(N).fill(0);for(const i of centers){v[i]=amp;v[i+1]=-.42*amp;v[i+2]=-.13*amp}
 return {schema:'bts.maxtwo-inert-readback.v1',source:'simulated',instrumentId:'10-12',sampleId:sampleIds[s.well],wellId:s.well,sessionId:'DUMMY-SESSION-1',revision:1,centerXZM:positions[s.well],coordinates:{...point,unit:'mm from nominal sensing center'},dtS:DT,sampleCount:N,eventCount:v.filter(x=>x>.005).length,peakV:amp,channel:{id:point.id,unit:'V',samples:v},note:'Empty placeholder. Abstract generated signal; no real electronics, stimulation or biology.'}}
export function waveform(r){return {schema:'bts.analog-waveform.v1',origin:'simulated',kind:'simulated',sampleId:r.sampleId,revision:r.revision,dtS:r.dtS,channels:[r.channel],provenance:{device:r.instrumentId,sessionId:r.sessionId,wellId:r.wellId,pointId:r.channel.id}}}
