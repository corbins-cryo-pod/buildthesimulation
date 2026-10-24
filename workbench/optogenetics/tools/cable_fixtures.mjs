/** Frozen-state linear-system probes. Python independently assembles the cable
 * matrix from geometry and parameters; native gate values are shared inputs. */
import fs from 'node:fs';
import {resolveNodes,DEFAULT_CONFIG} from '../src/simulation.js';
import {createActiveCable,stepActiveCable} from '../vendor/cortex/active-cable.js';
import {chr2CurrentFactor,chr2SlopeFactor} from '../src/opsin.js';
const model=JSON.parse(fs.readFileSync(new URL('../data/cell-data.json',import.meta.url)));
const cases=[];
for(const segmentLengthUm of [40,20])for(const kind of ['rest','photocurrent','optical-and-spatial-drive']){
 const nodes=resolveNodes(model,{...DEFAULT_CONFIG,segmentLengthUm});
 const c=createActiveCable(nodes,model.fit),n=nodes.length,dt=.005;
 for(let i=0;i<n;i++) c.voltageMv[i]=-80+5*Math.sin(i*.71);
 const synapticUs=new Float64Array(n),membraneOffsetNa=new Float64Array(n),injectionNa=new Float64Array(n),extracellularMv=new Float64Array(n);
 for(let i=0;i<n;i++){
  if(nodes[i].areaUm2>0 && kind!=='rest'){
   const base=.00035*nodes[i].areaUm2*.01*.3;
   synapticUs[i]=base*chr2SlopeFactor(c.voltageMv[i]);
   membraneOffsetNa[i]=base*chr2CurrentFactor(c.voltageMv[i])-synapticUs[i]*c.voltageMv[i];
  }
  if(kind==='optical-and-spatial-drive'){
   extracellularMv[i]=nodes[i].centerUm[0]*.0001;
   if(nodes[i].sectionType==='soma'&&nodes[i].areaUm2>0)injectionNa[i]=.8;
  }
 }
 const oldVoltage=Array.from(c.voltageMv);
 stepActiveCable(c,dt,{synapticUs,membraneOffsetNa,injectionNa,extracellularMv});
 cases.push({name:kind+'-'+segmentLengthUm,dtMs:dt,nodes:nodes.map(({parent,edgeUs,areaUm2,sectionType})=>({parent,edgeUs,areaUm2,sectionType})),fit:model.fit,oldVoltageMv:oldVoltage,conductanceUs:Array.from(c.conductance),calciumReversalMv:Array.from(c.caReversal),synapticUs:Array.from(synapticUs),membraneOffsetNa:Array.from(membraneOffsetNa),injectionNa:Array.from(injectionNa),extracellularMv:Array.from(extracellularMv),hinesVoltageMv:Array.from(c.voltageMv)});
}
fs.writeFileSync(new URL('../validation/cable-probes.json',import.meta.url),JSON.stringify({scope:'One frozen-state linear solve, not independent native-channel dynamics or a full optical-neuron reference',cases}));
