/** Outward conventional Cl current > 0 means intracellular Cl loading.
 * nA*ms / F / um³ -> mM has conversion 1e6. No bicarbonate, axial Cl diffusion,
 * explicit KCC2/NKCC1 kinetics, extracellular depletion or electroneutral volume.
 */
const FARADAY=96485.33212;
function chlorideReversal(insideMm,outsideMm=130,tempC=34){
 if(!(insideMm>0&&outsideMm>0)||!Number.isFinite(insideMm+outsideMm+tempC))throw Error('Chloride concentrations must be positive and finite.');
 return -1000*8.314462618*(273.15+tempC)/FARADAY*Math.log(outsideMm/insideMm);
}
function compartmentVolume(node){
 if(!(node.areaUm2>0))return 0;
 if(node.sectionType==='soma'){const r=Math.sqrt(node.areaUm2/(4*Math.PI));return 4*Math.PI*r*r*r/3;}
 const points=node.pathUm??[],diam=node.pathDiameterUm??[];let volume=0;
 for(let j=1;j<points.length;j++){
  const length=Math.hypot(...points[j].map((x,k)=>x-points[j-1][k]));
  const r0=(diam[j-1]??node.diameterUm)/2,r1=(diam[j]??node.diameterUm)/2;
  volume+=Math.PI*length*(r0*r0+r0*r1+r1*r1)/3;
 }
 return volume||Math.PI*(node.diameterUm/2)**2*node.lengthUm;
}
function advanceChloride(ci,currentNa,volumeUm3,dtMs,setpointMm,recoveryMs,dynamic=true){
 if(!dynamic)return ci;
 if(!(volumeUm3>0&&dtMs>0&&recoveryMs>0))throw Error('Invalid chloride volume or timestep.');
 const flux=currentNa*1e6/(FARADAY*volumeUm3),decay=Math.exp(-dtMs/recoveryMs);
 const next=ci*decay+setpointMm*(1-decay)+flux*recoveryMs*(-Math.expm1(-dtMs/recoveryMs));
 if(!Number.isFinite(next)||next<.01||next>300)throw Error('Chloride pool left 0.01–300 mM. Reduce conductance/drive or refine dt; values are not silently clipped.');
 return next;
}
export {FARADAY,chlorideReversal,compartmentVolume,advanceChloride};
