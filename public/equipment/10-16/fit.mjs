export const design=Object.freeze({openingMm:Object.freeze([54,34]),couponMm:Object.freeze([48,28,4]),requiredMm:.5,anchorM:Object.freeze([.243,.010,.076]),id:'DRY-TEAL-01'});
const points=Object.freeze({P1:Object.freeze([-15,7]),P2:Object.freeze([15,-7])});
export const station=()=>({rotationDeg:0,offsetXmm:0,landmark:'P1',result:null,revision:0});
function round(x){return Math.round(x*1e6)/1e6}
export function measure({rotationDeg,offsetXmm,landmark,revision=1}){
 if(![0,90].includes(rotationDeg)||!Number.isInteger(offsetXmm)||Math.abs(offsetXmm)>12||!Object.hasOwn(points,landmark))throw RangeError('Choose 0° or 90°, integer X offset within ±12 mm and a marked ID.');
 const [w,d]=rotationDeg===0?design.couponMm:[design.couponMm[1],design.couponMm[0]], dx=(design.openingMm[0]-w)/2,dz=(design.openingMm[1]-d)/2;
 const marginsMm={'−X':dx+offsetXmm,'+X':dx-offsetXmm,'−Z':dz,'+Z':dz},minMm=Math.min(...Object.values(marginsMm)),[p,q]=points[landmark];
 // glTF positive Y turns a local positive X direction toward negative Z.
 const [x,z]=rotationDeg===0?[p,q]:[q,-p],point=[round(x+offsetXmm),4,round(z)];
 return {schema:'bts.inert-fit-check.v1',sampleId:design.id,revision,provenance:'Author-designed dry gauge. Not part of Leica hardware; no biological or operating data.',axes:'glTF +Y up; +Z toward viewer from instrument rear; local mm relative to tray inner floor',units:'mm',openingMm:[...design.openingMm],couponMm:[...design.couponMm],requiredMm:design.requiredMm,rotationDeg,offsetXmm,marginsMm,minMm,fits:minMm>=design.requiredMm,landmark:{id:landmark,couponPositionMm:[p,4,q],trayPositionMm:point}};
}
export function act(s,key,arg){
 if(key==='reset')return station();
 if(key==='verify'){const revision=s.revision+1;return{...s,revision,result:measure({...s,revision})}}
 if(key==='rotate')return {...s,rotationDeg:s.rotationDeg===0?90:0,result:null};
 if(!['offsetXmm','landmark'].includes(key))throw Error('Unknown dry gauge action');
 const next={...s,[key]:arg,result:null};measure(next);return next;
}
