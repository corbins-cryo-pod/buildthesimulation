const line=values=>values.map(x=>{const s=String(x??'');return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}).join(',');
export function exportCsv(result,kind){
 const rows=[];
 if(kind==='matrix'){
  const controls=Object.keys(result.points[0].matrices);rows.push(['amplitude','amplitude_unit','channel','cell',...controls]);
  for(const p of result.points)for(const pair of p.pairs)rows.push([p.amplitude,result.units.amplitude,pair.channelId,pair.cellId,...controls.map(c=>p.matrices[c][pair.channelIndex][pair.cellIndex])]);
 }else if(kind==='events'){
  rows.push(['amplitude','amplitude_unit','channel','cell','intervention','event_json']);for(const p of result.points)for(const pair of p.pairs)for(const [control,t] of Object.entries(pair.interventions))for(const event of t.events)rows.push([p.amplitude,result.units.amplitude,pair.channelId,pair.cellId,control,JSON.stringify(event)]);
 }else if(kind==='yield'){
  rows.push(['amplitude','original_census','original_preserved','original_unique','original_Y','introduced_exclusive_conditional','introduced_shared_only_conditional']);for(const p of result.points)rows.push([p.amplitude,result.originalHost.census,result.originalHost.preserved,result.originalHost.uniquelyAddressed,result.originalHost.y,p.metrics.headline?.exclusiveCount??'withheld',p.metrics.headline?.sharedOnlyCount??'withheld']);
 }else if(kind==='timeseries'){
  rows.push(['amplitude','amplitude_unit','channel','cell','intervention','compartment','time_ms','voltage_mV']);for(const p of result.points)for(const pair of p.pairs)for(const [control,t]of Object.entries(pair.interventions))for(let j=0;j<t.voltageMv.length;j++)for(let k=0;k<t.timeMs.length;k++)rows.push([p.amplitude,result.units.amplitude,pair.channelId,pair.cellId,control,result.morphology.recordIndices[j],t.timeMs[k],t.voltageMv[j][k]]);
 }else throw new Error('Unknown CSV export.');
 return rows.map(line).join('\n')+'\n';
}
