// Passive finite-volume cable on the grown graph. µm, ms, pF, nS, mV, pA.
// No AP/channel kinetics or claimed preparation-specific membrane fit.
export function passiveCable(sim,cellId=0,{dtMs=.05,durationMs=120,currentPA=10}={}){
  const cell=sim.cells[cellId];if(!cell||!Number.isFinite(dtMs)||dtMs<.005||dtMs>1||!Number.isFinite(durationMs)||durationMs<1||durationMs>500||!Number.isFinite(currentPA)||Math.abs(currentPA)>1000)throw Error('Invalid cable assay');
  const segments=sim.segments.filter(s=>s.alive&&s.cellId===cellId),nodes=[{id:-1,parent:-1,area:cell.membrane.area,c:cell.membrane.area*.01,g:cell.membrane.area*.001,axial:0,length:0}],ids=new Map();
  for(const s of segments){const l=Math.max(.1,Math.hypot(...s.end.map((v,i)=>v-s.start[i]))),area=2*Math.PI*s.radius*l,parent=s.parentId<0?0:ids.get(s.parentId);if(parent===undefined)throw Error('Disconnected cable');ids.set(s.id,nodes.length);
    // Vertex-centred control volumes: split each shaft's surface equally
    // between its endpoints, retaining total capacitance and leak at branches.
    nodes[parent].area+=area/2;nodes[parent].c+=area*.005;nodes[parent].g+=area*.0005;
    nodes.push({id:s.id,parent,area:area/2,c:area*.005,g:area*.0005,axial:1e5*Math.PI*s.radius*s.radius/(150*l),length:l+nodes[parent].length});}
  const n=nodes.length,v=Array(n).fill(-65),samples=[];let distal=0;for(let i=1;i<n;i++)if(nodes[i].length>nodes[distal].length)distal=i;
  const stepCount=Math.ceil(durationMs/dtMs);let nextSample=0;
  for(let step=0;step<stepCount;step++){
    const t=step*dtMs,h=Math.min(dtMs,durationMs-t),d=nodes.map(o=>o.c/h+o.g+o.axial),b=nodes.map((o,i)=>o.c/h*v[i]+o.g*-65+(i===0&&t>=20&&t<80?currentPA:0));
    for(let i=1;i<n;i++)d[nodes[i].parent]+=nodes[i].axial;
    // Tree elimination, then back substitution; no dense matrix allocation.
    for(let i=n-1;i>0;i--){const p=nodes[i].parent,g=nodes[i].axial;d[p]-=g*g/d[i];b[p]+=g*b[i]/d[i];}
    v[0]=b[0]/d[0];for(let i=1;i<n;i++)v[i]=(b[i]+nodes[i].axial*v[nodes[i].parent])/d[i];
    if(t+h>=nextSample){samples.push({timeMs:t+h,somaMV:v[0],distalMV:v[distal]});nextSample+=.5;}
  }
  return {model:'v5/passive-tree-cable/1',cellId,growthTimeHours:sim.timeHours,compartments:n,distalPathUm:nodes[distal].length,dtMs,durationMs,currentPA,samples,parameters:{capacitanceUFcm2:1,leakMSPerCm2:.1,axialResistivityOhmCm:150},scope:'Passive cable on actual grown geometry; illustrative Cm=1 µF/cm², leak=0.1 mS/cm², Ra=150 Ω·cm. No spikes or fitted electrophysiology.'};
}
