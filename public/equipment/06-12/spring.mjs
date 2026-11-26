export const fixture=Object.freeze({id:'BTS-DRY-SPRING-01',revision:'1',gapUm:25,beamStiffnessMnPerUm:.16,forceCeilingMn:5,roundingStepMn:.01,stepUm:5,maxTravelUm:160});
export const targets=Object.freeze({Preview_toggle_key:'togglePreview',Run_virtual_trace_key:'run'});
export const stiffnesses=Object.freeze([.02,.04,.08]);
export function point(travelUm,springK){
 if(!Number.isFinite(travelUm)||travelUm<0||travelUm>fixture.maxTravelUm)throw new RangeError('Choose virtual travel between 0 and 160 µm.');
 if(!stiffnesses.includes(springK))throw new RangeError('Choose a listed synthetic spring.');
 const stroke=Math.max(0,travelUm-fixture.gapUm), kb=fixture.beamStiffnessMnPerUm;
 const idealMn=stroke/(1/springK+1/kb),overload=idealMn>fixture.forceCeilingMn+1e-12;
 const displayedMn=overload?null:Math.round(idealMn/fixture.roundingStepMn)*fixture.roundingStepMn;
 const reconstructedSpringUm=displayedMn===null?null:Math.max(0,stroke-displayedMn/kb);
 return {travelUm,contact:stroke>0,totalCompressionUm:stroke,idealMn,displayedMn,springCompressionUm:idealMn/springK,beamDeflectionUm:idealMn/kb,reconstructedSpringUm,overload};
}
function slope(rows,x,y){
 const a=rows.filter(p=>p[x]>0&&p[y]>0);
 if(a.length<2)return null;
 let xx=0,xy=0;for(const p of a){xx+=p[x]*p[x];xy+=p[x]*p[y];}return xy/xx;
}
export function run(travelUm,springK){
 const end=point(travelUm,springK);
 if(end.overload)throw new RangeError('Virtual 5 mN ceiling exceeded. Choose less travel or a softer spring; no trace was recorded.');
 const rows=[];
 for(let x=0;x<travelUm;x+=fixture.stepUm)rows.push(point(x,springK));
 rows.push(end);
 const fits={effectiveMnPerUm:slope(rows,'totalCompressionUm','displayedMn'),springMnPerUm:slope(rows,'reconstructedSpringUm','displayedMn')};
 return {travelUm,springK,rows,fits,peakDisplayedMn:end.displayedMn};
}
export function createStation(){
 const init=()=>({travelUm:100,springK:.04,showPreview:false,result:null,error:null});
 let s=init();
 const read=()=>({...structuredClone(s),preview:point(s.showPreview?s.travelUm:0,s.springK)});
 function dispatch(k,p){
  const n={...s,error:null};
  try{
   if(k==='reset'){s=init();return read();}
   if(k==='togglePreview')n.showPreview=!s.showPreview;
   if(k==='travel'){point(p,s.springK);n.travelUm=p;n.result=null;}
   if(k==='stiffness'){point(s.travelUm,p);n.springK=p;n.result=null;}
   if(k==='run'){n.result=run(s.travelUm,s.springK);n.showPreview=true;}
   s=n;
  }catch(e){s={...s,error:e.message,result:null};}
  return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):read()};
}
export function jsonRecord(state){
 if(!state.result)throw new Error('Run the virtual trace before exporting.');
 return {schema:'bts.microtester.dry-spring.v1',equipment:'06-12',kind:'simulated',fixture,units:{force:'mN',displacement:'µm',stiffness:'mN/µm'},model:'massless quasistatic linear springs in series; dry and fictitious',result:state.result};
}
export function csvRecord(state){
 const r=jsonRecord(state);
 return ['sample_id,revision,travel_um,in_contact,displayed_force_mN,ideal_force_mN,spring_compression_um,beam_deflection_um,reconstructed_spring_um',...r.result.rows.map(x=>[r.fixture.id,r.fixture.revision,x.travelUm,x.contact,x.displayedMn,x.idealMn,x.springCompressionUm,x.beamDeflectionUm,x.reconstructedSpringUm].join(','))].join('\n')+'\n';
}
