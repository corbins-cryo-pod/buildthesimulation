// Deterministic, passive data replay. No equipment control or materials/certification claims.
export const fixture=Object.freeze({sampleId:'BTS-WIRE-COUPON-A',bonds:Object.freeze([
 {id:'B1',pads:['P1','P2'],xMm:-15},{id:'B2',pads:['P3','P4'],xMm:0},{id:'B3',pads:['P5','P6'],xMm:15}].map(Object.freeze))});
export const template=Object.freeze([[0,0,0],[.1,30,.08],[.2,60,.16],[.3,107,.25],[.4,140,.32],[.5,164,.062],[.6,178,.011],[.7,190,0]].map(Object.freeze));
export const maxN=.980665; // 100 gram-force, not grams mass
export const gf=n=>n/.00980665;
export const initial=()=>({revision:0,parentRevision:null,sampleId:fixture.sampleId,bonds:fixture.bonds.map(x=>({id:x.id,pads:[...x.pads],state:'connected'}))});
const clone=x=>structuredClone(x),bad=(code,message)=>({ok:false,code,message});
export function replay(state,bondId,trace=template,annotation='wire-break'){
 const bond=state?.bonds.find(x=>x.id===bondId);
 if(!bond)return bad('selection','Select a bond in the inert fixture.');
 if(bond.state!=='connected')return bad('already-tested','This connection is already invalidated. Select another bond or reset.');
 if(!['wire-break','bond-lift'].includes(annotation))return bad('annotation','A known destructive failure label is required.');
 if(!Array.isArray(trace)||trace.length<3||trace.length>5000||trace.some((p,i)=>!Array.isArray(p)||p.length!==3||p.some(x=>!Number.isFinite(x)||x<0)||p[2]>maxN||(i>0&&(p[0]<=trace[i-1][0]||p[1]<trace[i-1][1]))))return bad('trace','Invalid ordered time/displacement/force record or exceeds the virtual 100 gf range.');
 const iPeak=trace.reduce((a,x,i)=>x[2]>trace[a][2]?i:a,0),p=trace[iPeak];
 if(p[2]<=0)return bad('trace','The replay must contain a positive pull force.');
 const preTest=clone(state),postTest=clone(state);postTest.parentRevision=state.revision;postTest.revision++;
 postTest.bonds.find(x=>x.id===bondId).state='invalidated';
 const event={schema:'bts.bond-test-event.v1',equipmentId:'08-06',sampleId:state.sampleId,bondId,parentRevision:preTest.revision,revision:postTest.revision,
  provenance:{mode:'synthetic calibrated-unit replay; no instrument measurement',cartridge:'WP100g modeled range',failureLabelSource:'predeclared fixture annotation',measured:false},
  peak:{forceN:p[2],forceMilliN:p[2]*1000,forceGramForce:gf(p[2]),displacementUm:p[1],timeS:p[0],index:iPeak},
  classification:annotation,trace:{columns:['time_s','vertical_displacement_um','pull_force_N'],samples:clone(trace)},preTest,postTest};
 return {ok:true,event};
}
export const targets=Object.freeze({Seat_coupon:'toggleSample',Hook_shaft:'engage',Joystick_run:'run',Bond_B1:'selectB1',Bond_B2:'selectB2',Bond_B3:'selectB3'});
export function createStation(){
 let assembly=initial(),loaded=true,engaged=false,selected='B1',event=null,error=null,log=[];
 const read=()=>({assembly:clone(assembly),loaded,engaged,selected,event,error,log:log.slice()});
 function dispatch(action,arg){
  error=null;
  if(action==='reset'){assembly=initial();loaded=true;engaged=false;selected='B1';event=null;log=[];}
  else if(action==='toggleSample'){loaded=!loaded;engaged=false;}
  else if(action==='select'||/^selectB[123]$/.test(action)){
   const q=arg??action.slice(6);if(fixture.bonds.some(b=>b.id===q)){selected=q;engaged=false;}
  }else if(action==='engage'){
   if(!loaded)error=bad('fixture-empty','Seat the inert coupon first.');
   else if(assembly.bonds.find(b=>b.id===selected).state!=='connected')error=bad('already-tested','Select an intact bond.');
   else engaged=!engaged;
  }else if(action==='run'){
   if(!loaded||!engaged)error=bad('hook','Seat the coupon and engage the hook before replay.');
   else{const x=replay(assembly,selected);if(!x.ok)error=x;else{event=x.event;assembly=x.event.postTest;log=[...log,x.event];engaged=false;}}
  }else throw Error('Unknown test station action '+action);
  return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):null};
}
export function pose(s){
 const x=fixture.bonds.find(b=>b.id===s.selected)?.xMm??0;
 return {couponVisible:s.loaded,hookDropM:s.engaged?-.024:0,stageOffsetM:-x/1000,invalidated:s.assembly.bonds.filter(b=>b.state==='invalidated').map(b=>b.id)};
}
export function csv(event){
 return ['# origin=simulated','# sampleId='+event.sampleId,'# bondId='+event.bondId,'# parentRevision='+event.parentRevision,'# revision='+event.revision,'# failure='+event.classification,event.trace.columns.join(','),...event.trace.samples.map(x=>x.join(','))].join('\n')+'\n';
}
