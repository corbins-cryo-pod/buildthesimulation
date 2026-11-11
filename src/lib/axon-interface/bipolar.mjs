/** Explicit hypothetical bipolar projecting neuron; not human SG calibration. */
import {createMorphology,MRG_VERSION,MRG_SOURCE} from './mrg.mjs';
export {simulateCable} from './mrg.mjs';
export const BIPOLAR_VERSION='bipolar-projecting-neuron-1.1.0-axial-soma-hypothesis';
export const BIPOLAR_DEFAULTS=Object.freeze({somaDiameterUm:20,peripheralStemLengthUm:30,peripheralStemDiameterUm:1.5,centralStemLengthUm:50,centralStemDiameterUm:2.5,
  peripheralFiberDiameterUm:5.7,centralFiberDiameterUm:5.7,armNodeCount:6,passiveSegments:3,stemSegments:3,somaSegments:5,somaActiveScale:.1,stemActiveScale:.1,temperatureC:37,equilibrationMs:50});
export const BIPOLAR_PARAMETERS=Object.freeze(Object.fromEntries(Object.entries(BIPOLAR_DEFAULTS).map(([key,value])=>[key,{value,units:key.endsWith('Um')?'um':key.endsWith('C')?'degC':key.endsWith('Ms')?'ms':'dimensionless',
  evidence:['temperatureC','peripheralFiberDiameterUm','centralFiberDiameterUm'].includes(key)?'mathematical':['passiveSegments','stemSegments','somaSegments','equilibrationMs'].includes(key)?'estimated':'hypothetical',
  source:key==='temperatureC'?'Published MRG reference temperature':key.includes('FiberDiameter')?'Selects a published MRG motor-fiber table entry; not measured SG axon diameter':
    key.endsWith('ActiveScale')?'Declared before testing: distributed soma/stem active density is 10% of the specialized nodal density. Sensitivity includes 0,0.03,0.1,0.3,1. No measured density or fitted human value is claimed.':
    key==='somaDiameterUm'?'Midpoint of the requested 15–25 um soma range; modeled, not measured in this preparation':'Explicit anatomical or numerical hypothesis; see bipolar-acceptance.json'}])));
const requiredPositive=(v,k)=>{if(!Number.isFinite(v)||v<=0)throw new Error(`${k} must be positive and finite.`);};
const odd=(v,k,min=1)=>{if(!Number.isInteger(v)||v<min||v%2!==1)throw new Error(`${k} must be an odd integer >= ${min}.`);};

function connections(compartments){
  const axialUs=new Float64Array(compartments.length-1),periaxonalUs=new Float64Array(compartments.length-1);
  for(let i=0;i<axialUs.length;i++){
    const a=compartments[i],b=compartments[i+1];axialUs[i]=2e6/(a.axialResistanceOhm+b.axialResistanceOhm);
    periaxonalUs[i]=a.periaxonalResistanceOhm===null||b.periaxonalResistanceOhm===null?0:2e6/(a.periaxonalResistanceOhm+b.periaxonalResistanceOhm);
  }
  return {axialUs,periaxonalUs};
}

export function createBipolarMorphology(input={}){
  const p={};for(const [key,value] of Object.entries(BIPOLAR_DEFAULTS))p[key]=input[key]??value;
  const origin=input.originUm??[0,0,0];if(!Array.isArray(origin)||origin.length!==3||!origin.every(Number.isFinite))throw new Error('originUm requires three finite coordinates.');
  for(const key of ['somaDiameterUm','peripheralStemLengthUm','peripheralStemDiameterUm','centralStemLengthUm','centralStemDiameterUm'])requiredPositive(p[key],key);
  if(p.somaDiameterUm<15||p.somaDiameterUm>25)throw new Error('The declared SG-like soma range is 15–25 um.');
  if(p.peripheralStemDiameterUm>=p.somaDiameterUm||p.centralStemDiameterUm>=p.somaDiameterUm)throw new Error('Stem diameter must be less than soma diameter.');
  if(!Number.isInteger(p.armNodeCount)||p.armNodeCount<5)throw new Error('armNodeCount must be an integer >=5 to define three distal monitors beyond the initiation region.');
  odd(p.passiveSegments,'passiveSegments');odd(p.stemSegments,'stemSegments');odd(p.somaSegments,'somaSegments');
  if(p.temperatureC!==37)throw new Error('The declared kinetic benchmark is at 37 degC.');
  for(const key of ['somaActiveScale','stemActiveScale'])if(!Number.isFinite(p[key])||p[key]<0||p[key]>1)throw new Error(`${key} must be within [0,1].`);
  const R=p.somaDiameterUm/2,left=-Math.sqrt(R*R-(p.peripheralStemDiameterUm/2)**2),right=Math.sqrt(R*R-(p.centralStemDiameterUm/2)**2);
  const armSpecs={peripheral:createMorphology({fiberDiameterUm:p.peripheralFiberDiameterUm,nodes:2*p.armNodeCount-1,passiveSegments:p.passiveSegments}),central:createMorphology({fiberDiameterUm:p.centralFiberDiameterUm,nodes:2*p.armNodeCount-1,passiveSegments:p.passiveSegments})};
  const leftSections=armSpecs.peripheral.sections.filter(s=>s.index<=11*(p.armNodeCount-1));
  const rightSections=armSpecs.central.sections.filter(s=>s.index>=11*(p.armNodeCount-1));
  const leftLength=leftSections.reduce((sum,s)=>sum+s.lengthUm,0);
  let z=origin[2]+left-p.peripheralStemLengthUm-leftLength;
  const compartments=[],sections=[],nodeIndices=[],activeSiteIndices=[],roleIndices={soma:[],peripheralStem:[],centralStem:[],peripheralNodes:[],centralNodes:[]};
  function addSection(section,records,role,arm){
    const s={...section,index:sections.length,startIndex:compartments.length,role,arm};sections.push(s);
    for(const record of records){
      const c={...record,index:compartments.length,sectionIndex:s.index,role,arm,zUm:z+record.lengthUm/2,positionUm:[origin[0],origin[1],z+record.lengthUm/2],nodeOrdinal:null};
      c.samplingSurface={type:'cylinder',radiusUm:c.diameterUm/2,zMinUm:z,zMaxUm:z+c.lengthUm,centerUm:[origin[0],origin[1],c.zUm]};
      if(c.kind==='NODE'){c.nodeOrdinal=nodeIndices.length;nodeIndices.push(c.index);roleIndices[arm+'Nodes'].push(c.index);activeSiteIndices.push(c.index);}
      if(c.kind==='SOMA'||c.kind==='STEM'){activeSiteIndices.push(c.index);roleIndices[c.kind==='SOMA'?'soma':arm+'Stem'].push(c.index);}
      compartments.push(c);z+=c.lengthUm;
    }
  }
  function addArm(name,descriptors){
    const base=armSpecs[name];for(const s of descriptors)addSection(s,base.compartments.slice(s.startIndex,s.startIndex+s.nseg),`${name}_${s.kind.toLowerCase()}`,name);
  }
  function addExposed(kind,L,d,nseg,scale,arm,role){
    const segmentLength=L/nseg,areaCm2=Math.PI*d*segmentLength*1e-8;
    const template={kind,lengthUm:segmentLength,diameterUm:d,axonDiameterUm:d,spaceUm:0,areaCm2,cmNf:2*areaCm2*1000,leakUs:.007*areaCm2*1e6,leakReversalMv:-90,
      activeScale:scale,myelinCapNf:0,myelinGUs:1e10*areaCm2*1e6,axialResistanceOhm:.7e6*segmentLength/(Math.PI*d*d/4),periaxonalResistanceOhm:null,hypotheticalSoma:kind==='SOMA'};
    addSection({kind,lengthUm:L,diameterUm:d,axonDiameterUm:d,spaceUm:0,nseg},Array.from({length:nseg},(_,segment)=>({...template,segment})),role,arm);
  }
  addArm('peripheral',leftSections);
  addExposed('STEM',p.peripheralStemLengthUm,p.peripheralStemDiameterUm,p.stemSegments,p.stemActiveScale,'peripheral','peripheral_stem');
  addExposed('SOMA',right-left,p.somaDiameterUm,p.somaSegments,p.somaActiveScale,null,'soma');
  addExposed('STEM',p.centralStemLengthUm,p.centralStemDiameterUm,p.stemSegments,p.stemActiveScale,'central','central_stem');
  addArm('central',rightSections);
  const somaIndex=roleIndices.soma[Math.floor(p.somaSegments/2)],soma={centerUm:[...origin],radiusUm:R,zMinUm:origin[2]+left,zMaxUm:origin[2]+right,compartmentIndex:somaIndex,compartmentIndices:[...roleIndices.soma],segments:p.somaSegments,
    electricalApproximation:'Axially segmented equivalent cylinder, area matched to spherical surface bands; circumferential nonlinear membrane polarization is not resolved.'};
  for(const i of roleIndices.soma){const c=compartments[i];c.samplingSurface={type:'sphere-band',centerUm:[...origin],radiusUm:R,zMinUm:c.zUm-c.lengthUm/2,zMaxUm:c.zUm+c.lengthUm/2};}
  const armNodeIndices={peripheral:[...roleIndices.peripheralNodes].reverse(),central:[...roleIndices.centralNodes]};
  const nodeOrdinal=new Map(nodeIndices.map((i,n)=>[i,n]));
  const armMonitors=Object.fromEntries(Object.entries(armNodeIndices).map(([name,indices])=>{const chosen=indices.slice(-4,-1);return [name,{compartmentIndices:chosen,nodeOrdinals:chosen.map(i=>nodeOrdinal.get(i)),direction:name==='central'?'+z':'-z'}];}));
  const initiationRegionIndices=[...roleIndices.soma,...roleIndices.peripheralStem,...roleIndices.centralStem,armNodeIndices.peripheral[0],armNodeIndices.central[0]].sort((a,b)=>a-b);
  const start=compartments[0].zUm-compartments[0].lengthUm/2,end=compartments.at(-1).zUm+compartments.at(-1).lengthUm/2;
  return {modelVersion:MRG_VERSION,bipolarVersion:BIPOLAR_VERSION,type:'bipolar-projecting-neuron',parameters:p,source:MRG_SOURCE,temperatureC:37,originUm:[...origin],
    fiberDiameterUm:p.centralFiberDiameterUm,somaDiameterUm:p.somaDiameterUm,somaActiveScale:p.somaActiveScale,passiveSegments:p.passiveSegments,stemSegments:p.stemSegments,somaSegments:p.somaSegments,
    nodes:nodeIndices.length,armNodeCount:p.armNodeCount,compartments,sections,nodeIndices,activeSiteIndices,activeSites:activeSiteIndices,eventSiteCount:activeSiteIndices.length,
    recordingIndices:[...activeSiteIndices],roleIndices,armNodeIndices,armMonitors,somaIndex,somaIndices:[...roleIndices.soma],centralNodeIndex:somaIndex,initiationRegionIndices,soma,
    lengthUm:end-start,zMinUm:start,zMaxUm:end,...connections(compartments),equilibriumKey:{type:BIPOLAR_VERSION,...p},numericalDefaults:{dtMs:.000625,equilibrationMs:50},
    modelBoundary:'Explicit hypothetical bipolar projecting neuron with soma, separate unmyelinated stems and two MRG motor-fiber arms. Numerical verification is not measured human SG or engineered-cell calibration.'};
}

export function outerRadiusAt(morphology,zUm){
  const s=morphology.soma;if(s&&zUm>=s.zMinUm&&zUm<=s.zMaxUm)return Math.sqrt(Math.max(0,s.radiusUm**2-(zUm-s.centerUm[2])**2));
  const c=morphology.compartments.find(c=>zUm>=c.zUm-c.lengthUm/2&&zUm<=c.zUm+c.lengthUm/2);return c?c.diameterUm/2:0;
}

export function createNativeStumpMorphologies(bipolar){
  if(bipolar.type!=='bipolar-projecting-neuron')throw new Error('Native stump construction requires the declared bipolar morphology.');
  function stump(arm){
    const original=bipolar.compartments.filter(c=>c.arm===arm&&c.kind!=='STEM'),oldToNew=new Map(original.map((c,i)=>[c.index,i]));
    const compartments=original.map((c,index)=>({...c,index,nativeStump:true,hypotheticalSoma:false}));
    const sections=bipolar.sections.filter(s=>s.arm===arm&&s.kind!=='STEM').map((s,index)=>({...s,index,startIndex:oldToNew.get(s.startIndex)}));
    const oldSectionToNew=new Map(bipolar.sections.filter(s=>s.arm===arm&&s.kind!=='STEM').map((s,i)=>[s.index,i]));
    for(const c of compartments)c.sectionIndex=oldSectionToNew.get(c.sectionIndex);
    const nodeIndices=compartments.filter(c=>c.kind==='NODE').map(c=>c.index);for(let n=0;n<nodeIndices.length;n++)compartments[nodeIndices[n]].nodeOrdinal=n;
    const monitorIndices=bipolar.armMonitors[arm].compartmentIndices.map(i=>oldToNew.get(i));
    const monitor={...bipolar.armMonitors[arm],compartmentIndices:monitorIndices,nodeOrdinals:monitorIndices.map(i=>nodeIndices.indexOf(i))};
    const start=compartments[0].zUm-compartments[0].lengthUm/2,end=compartments.at(-1).zUm+compartments.at(-1).lengthUm/2;
    return {modelVersion:MRG_VERSION,bipolarVersion:BIPOLAR_VERSION,type:'disconnected-native-stump',arm,parameters:{...bipolar.parameters},nodes:nodeIndices.length,
      fiberDiameterUm:bipolar.parameters[arm+'FiberDiameterUm'],temperatureC:37,originUm:[...bipolar.originUm],passiveSegments:bipolar.passiveSegments,somaDiameterUm:0,somaActiveScale:0,
      compartments,sections,nodeIndices,activeSiteIndices:[...nodeIndices],activeSites:[...nodeIndices],eventSiteCount:nodeIndices.length,recordingIndices:[...nodeIndices],
      roleIndices:{soma:[],peripheralStem:[],centralStem:[],peripheralNodes:arm==='peripheral'?[...nodeIndices]:[],centralNodes:arm==='central'?[...nodeIndices]:[]},
      armNodeIndices:{[arm]:arm==='peripheral'?[...nodeIndices].reverse():[...nodeIndices]},armMonitors:{[arm]:monitor},initiationRegionIndices:[],somaIndex:null,somaIndices:[],soma:null,
      lengthUm:end-start,zMinUm:start,zMaxUm:end,...connections(compartments),equilibriumKey:{type:'native-stump',arm,...bipolar.parameters},numericalDefaults:{dtMs:.000625,equilibrationMs:50},
      sealedBoundaries:true,connectedAcrossRemovedRegion:false,removedRegion:{zMinUm:bipolar.soma.zMinUm-bipolar.parameters.peripheralStemLengthUm,zMaxUm:bipolar.soma.zMaxUm+bipolar.parameters.centralStemLengthUm},
      modelBoundary:'One separately solved native axon stump after complete soma/stem resection; no implanted cell or physical connection across the removed region.'};
  }
  return {peripheral:stump('peripheral'),central:stump('central')};
}
