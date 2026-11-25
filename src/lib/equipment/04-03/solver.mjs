export const defaults={"sampleId":"SI-DEMO-001","revision":0,"waferMm":150,"substrateUm":500,"openingUm":20,"maskMaterial":"photoresist","maskUm":1,"cycles":100,"stepUm":0.8,"scallopUm":0.1,"taperDeg":0.2,"selectivity":150,"lag":0};
export function simulate(p){
 const ranges={waferMm:[150,150],substrateUm:[10,1000],openingUm:[2,200],maskUm:[.05,20],cycles:[1,400],stepUm:[.05,2],scallopUm:[0,.5],taperDeg:[-3,3],selectivity:[1,500],lag:[0,1],revision:[0,1e6]};
 for(const [k,[lo,hi]] of Object.entries(ranges)) if(typeof p[k]!=="number"||!Number.isFinite(p[k])||p[k]<lo||p[k]>hi)throw Error(k+" outside educational model range ("+lo+"–"+hi+")");
 if(!Number.isInteger(p.cycles)||!Number.isInteger(p.revision)||!p.sampleId?.trim()||!["photoresist","SiO2"].includes(p.maskMaterial))throw Error("Invalid sample ID, revision, cycles or mask material.");
 if(p.scallopUm>p.openingUm/4)throw Error("Scallop amplitude incompatible with mask opening.");
 let depth=0,wall=[],cycleData=[],maxDepth=Math.min(p.substrateUm,p.maskUm*p.selectivity);
 const slope=Math.tan(p.taperDeg*Math.PI/180);
 for(let k=0;k<p.cycles;k++){
  const step=p.stepUm/(1+p.lag*depth/p.openingUm);
  if(depth+step>=maxDepth-1e-10)throw Error("Cycle "+(k+1)+": mask exhausted or silicon breakthrough; stopped before unsupported geometry.");
  for(let j=0;j<=16;j++){
   if(k&&j===0)continue;
   const u=j/16,z=depth+step*u,x=p.openingUm/2-z*slope+p.scallopUm*Math.sin(Math.PI*u)**2;
   if(x<=0)throw Error("Cycle "+(k+1)+": tapered walls intersect.");
   wall.push({zUm:z,leftXUm:-x,rightXUm:x});
  }
  depth+=step; cycleData.push({cycle:k+1,depthUm:depth,stepUm:step,remainingMaskUm:p.maskUm-depth/p.selectivity});
 }
 return {schema:"bts.drie.trench.v1",deviceId:"04-03",sampleId:p.sampleId,revision:p.revision+1,parentRevision:p.revision,provenance:"Simulated; synthetic effective calibration, not measured or a qualified recipe",units:{length:"um",wafer:"mm",angle:"deg"},frame:"x=0 trench center; z=0 original silicon surface; +z into silicon",inputs:{...p},depthUm:depth,remainingMaskUm:p.maskUm-depth/p.selectivity,nominalBottomWidthUm:p.openingUm-2*depth*slope,scallopCount:p.scallopUm>0?p.cycles:0,wall,cycleData};
}
export function countScallops(r){
 const p=r.inputs,t=Math.tan(p.taperDeg*Math.PI/180),a=r.wall.map(w=>w.rightXUm+t*w.zUm-p.openingUm/2);
 return a.filter((v,i)=>i>0&&i<a.length-1&&v>a[i-1]+1e-10&&v>a[i+1]+1e-10).length;
}
