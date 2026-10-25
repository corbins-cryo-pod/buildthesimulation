export function validateSummary(data) {
  if(data?.schema!=='bts-recording-summary-v1'||!data.series?.length||!data.metrics?.length)throw new Error('Unrecognized study summary.');
  const ids=new Set();
  for(const series of data.series){
    if(ids.has(series.id)||!series.points?.length)throw new Error('Invalid array series.');ids.add(series.id);
    let day=-Infinity;
    for(const p of series.points){
      if(!Number.isFinite(p.day)||p.day<day)throw new Error('Invalid observation day.');day=p.day;
      for(const metric of data.metrics){const v=p[metric.id];if(v!==null&&!Number.isFinite(v))throw new Error('Invalid study measurement.');}
      if(p.percentYield<0||p.percentYield>100||!Number.isInteger(p.nSpikingElectrodes)||p.nSpikingElectrodes<0||p.nSpikingElectrodes>96)throw new Error('Invalid electrode yield.');
    }
  }
  return data;
}
