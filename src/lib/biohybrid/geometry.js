// Synthetic, explicitly parameterized branched neuronal trees. These are
// representative geometries, not reconstructions of an experimentally measured
// graft. Coordinates/diameters/lengths: µm; area: µm²; conductance: µS.
export function createGeometry(s) {
  const nodes = [], neurons = [], synapses = [];
  const norm = a => { const l = Math.hypot(...a); return a.map(v => v/l); };
  const add = (neuron, kind, parent, start, end, diameter, overrideLength) => {
    const length = overrideLength ?? Math.hypot(...end.map((v,i)=>v-start[i]));
    const n = {id:`${neuron.id}:${nodes.length}`,index:nodes.length,parent,neuronId:neuron.id,role:neuron.role,kind,
      startUm:start,endUm:end,centerUm:start.map((v,i)=>(v+end[i])/2),lengthUm:length,diameterUm:diameter,
      areaUm2:Math.PI*diameter*length,edgeUs:0};
    if(parent>=0){ const p=nodes[parent];
      const resistance=s.axialResistivityOhmCm*1e4*(length/2/(Math.PI*(diameter/2)**2)+p.lengthUm/2/(Math.PI*(p.diameterUm/2)**2));
      n.edgeUs=1e6/resistance;
    }
    nodes.push(n); return n.index;
  };
  const segment = (neuron,kind,parent,a,b,d0,d1=d0) => {
    const length=Math.hypot(...b.map((v,i)=>v-a[i]));
    const count=Math.max(1,Math.ceil(length/s.segmentLengthUm));
    let previous=parent;
    for(let j=0;j<count;j++){
      const start=a.map((v,i)=>v+(b[i]-v)*j/count),end=a.map((v,i)=>v+(b[i]-v)*(j+1)/count);
      previous=add(neuron,kind,previous,start,end,d0+(d1-d0)*(j+.5)/count);
      if(kind==='axon')neuron.axonIndices.push(previous);
    }
    return previous;
  };
  const makeCell=(id,role,center,rotation=0)=>{
    const neuron={id,label:`${role==='graft'?'Engineered':'Host'} ${id.split('-')[1]}`,role,somaIndex:-1,axonIndices:[],terminalIndex:-1,dendriteIndices:[]};
    neurons.push(neuron);
    const somaD=role==='graft'?20:23;
    neuron.somaIndex=add(neuron,'soma',-1,[center[0]-somaD/2,center[1],center[2]],[center[0]+somaD/2,center[1],center[2]],somaD);
    // Five primary arbors, each bifurcating twice. All rendered branches carry
    // their own membrane capacitance, conductance, voltage and axial current.
    for(let k=0;k<5;k++){
      const angle=2*Math.PI*k/5+rotation;
      const dir=norm([-.45+.8*Math.cos(angle),Math.sin(angle),.5*Math.sin(angle*2+.7)]);
      const a=center.map((v,i)=>v+dir[i]*somaD/2),b=center.map((v,i)=>v+dir[i]*58);
      const p=segment(neuron,'dendrite',neuron.somaIndex,a,b,3.4,2.5);
      if(k===0){
        // Fixed 6 µm synaptic landing branch preserves the same anatomical
        // attachment and source position when the rest of the tree is refined.
        const landing=b.map((v,i)=>v+(i===2?6:0));
        neuron.synapticTargetIndex=segment(neuron,'dendrite',p,b,landing,2);
      }
      for(let sign of [-1,1]){
        const d=norm([dir[0]+sign*.25,dir[1]+sign*.3,dir[2]+sign*.45]);
        const tip=b.map((v,i)=>v+d[i]*58);
        const branch=segment(neuron,'dendrite',p,b,tip,2.2,1.3);
        for(let twig of [-1,1]){
          const td=norm([d[0]+twig*.18,d[1]-twig*.15,d[2]+twig*.28]);
          const end=tip.map((v,i)=>v+td[i]*35);
          const terminal=segment(neuron,'dendrite',branch,tip,end,1.1,.65);
          neuron.dendriteIndices.push(terminal);
        }
      }
    }
    return neuron;
  };
  const grafts=[];
  for(let j=0;j<s.graftCount;j++){
    const y=(j-(s.graftCount-1)/2)*42, z=(j%2)*12-6;
    const cell=makeCell(`graft-${j+1}`,'graft',[0,y,z],j*.7);
    const start=[10,y,z];
    let p=cell.somaIndex;
    // Gently bending, mutually separated axon trajectories. Diameter is never
    // visually substituted in the numerical geometry.
    const steps=8;
    for(let k=0;k<steps;k++){
      const x0=10+(s.axonLengthUm-10)*k/steps,x1=10+(s.axonLengthUm-10)*(k+1)/steps;
      const point=x=>[x,y+10*Math.sin(Math.PI*x/s.axonLengthUm),z+7*Math.sin(2*Math.PI*x/s.axonLengthUm)];
      p=segment(cell,'axon',p,k===0?start:point(x0),point(x1),s.axonDiameterUm);
    }
    cell.terminalIndex=p;grafts.push(cell);
  }
  const hosts=[];
  for(let j=0;j<s.hostCount;j++){
    const center=[s.axonLengthUm+175,(j-(s.hostCount-1)/2)*140,0];
    const cell=makeCell(`host-${j+1}`,'host',center,.3+j*.6);
    const end=[center[0]+210,center[1]+15,center[2]+30];
    cell.terminalIndex=segment(cell,'axon',cell.somaIndex,[center[0]+11.5,center[1],center[2]],end,s.axonDiameterUm);
    hosts.push(cell);
  }
  // Synaptic contacts are explicit end-on branches; postsynaptic targets are
  // fixed dendritic landing compartments. Preserve branches when disconnected.
  for(let g=0;g<grafts.length;g++)for(let h=0;h<hosts.length;h++){
    const pre=grafts[g],post=hosts[h];
    const target=nodes[post.synapticTargetIndex];
    const start=nodes[pre.terminalIndex].endUm;
    const endpoint=target.centerUm.map((v,i)=>v+(i===2?2:0));
    const branchEnd=segment(pre,'axon',pre.terminalIndex,start,endpoint,s.axonDiameterUm*.8);
    synapses.push({id:`syn-${g+1}-${h+1}`,preNeuronId:pre.id,preIndex:branchEnd,postNeuronId:post.id,postIndex:target.index,
      weightUs:h<s.connectedHosts?s.synapticWeightUs:0,delayMs:s.synapticDelayMs,positionUm:target.centerUm});
  }
  // Shared parent half-cylinder resistance at every bifurcation.
  const children = Array.from({length:nodes.length},()=>[]);
  nodes.forEach((n,i)=>{if(n.parent>=0)children[n.parent].push(i);});
  const mapped=[],junctionMap=[],expanded=[];
  const halfResistance=n=>s.axialResistivityOhmCm*1e4*n.lengthUm/2/(Math.PI*(n.diameterUm/2)**2);
  nodes.forEach((n,i)=>{
    const originalParent=n.parent;
    const q={...n,index:expanded.length,parent:originalParent<0?-1:(junctionMap[originalParent]??mapped[originalParent])};
    if(originalParent>=0&&junctionMap[originalParent]!==undefined)q.edgeUs=1e6/halfResistance(n);
    mapped[i]=q.index;expanded.push(q);
    if(children[i].length>1){
      const j=expanded.length;junctionMap[i]=j;
      expanded.push({id:`${n.id}:junction`,index:j,parent:q.index,neuronId:n.neuronId,role:n.role,kind:'junction',
        startUm:[...n.endUm],endUm:[...n.endUm],centerUm:[...n.endUm],lengthUm:0,diameterUm:0,areaUm2:0,edgeUs:1e6/halfResistance(n)});
    }
  });
  nodes.splice(0,nodes.length,...expanded);
  neurons.forEach(n=>{n.somaIndex=mapped[n.somaIndex];n.synapticTargetIndex=mapped[n.synapticTargetIndex];n.terminalIndex=mapped[n.terminalIndex];n.axonIndices=n.axonIndices.map(i=>mapped[i]);n.dendriteIndices=n.dendriteIndices.map(i=>mapped[i]);});
  synapses.forEach(syn=>{syn.preIndex=mapped[syn.preIndex];syn.postIndex=mapped[syn.postIndex];});
  const contacts=[
    {id:'stim',kind:'stim',positionUm:[s.stimXUm,s.stimYUm,s.stimDistanceUm],radiusUm:s.contactRadiusUm,normal:[0,0,1]},
    {id:'return',kind:'return',positionUm:[-450,0,600],radiusUm:s.contactRadiusUm,normal:[0,0,1]},
    ...Array.from({length:3},(_,k)=>({id:`rec-${k+1}`,kind:'record',positionUm:[s.axonLengthUm+175+s.recordXOffsetUm,(k-1)*140,s.recordDistanceUm],radiusUm:s.recordRadiusUm,normal:[0,0,1]}))
  ];
  const xyz=nodes.flatMap(n=>[n.startUm,n.endUm]);
  const min=[0,1,2].map(k=>Math.min(...xyz.map(p=>p[k]))-30),max=[0,1,2].map(k=>Math.max(...xyz.map(p=>p[k]))+30);
  return {nodes,neurons,synapses,contacts,scaffold:{startUm:[0,0,0],endUm:[s.axonLengthUm,0,0],radiusUm:s.scaffoldRadiusUm},bounds:{min,max}};
}
