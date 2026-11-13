const spread=x=>Math.max(...x)-Math.min(...x);
export function confinement(modality,field,morphology,target){
 let quantity,units,values,lower=null,upper=null;
 if(modality==='electrode'){quantity='Maximum extracellular-potential difference along each cable';units='mV/uA';values=field.transfers.map(spread);}
 else if(modality==='magnetic'){
  quantity='Maximum magnitude of the nonuniform-grid axial electric-field gradient';units='V/m2 per (A/s)';
  values=field.transfers.map(t=>{const x=t.effective,z=morphology.compartments.map(c=>c.zUm);let peak=0;for(let i=1;i<x.length-1;i++){const a=z[i]-z[i-1],b=z[i+1]-z[i];peak=Math.max(peak,Math.abs(2*((x[i+1]-x[i])/b-(x[i]-x[i-1])/a)/(a+b))*1e9);}return peak;});
 }else{
  quantity='Area-weighted mean scalar fluence across expressing soma bands';units='mW/mm2 per emitted mW';
  const cells=1+Math.max(...field.bands.map(b=>b.cellIndex)),average=stat=>Array.from({length:cells},(_,j)=>{const bands=field.bands.filter(b=>b.cellIndex===j),area=bands.reduce((s,b)=>s+morphology.compartments[b.compartmentIndex].areaCm2,0);return bands.reduce((s,b)=>s+b[stat]*morphology.compartments[b.compartmentIndex].areaCm2,0)/area;});
  values=average('mean');lower=average('lower');upper=average('upper');
 }
 const off=values.filter((_,i)=>i!==target),maxOff=off.length?Math.max(...off):null;
 return {quantity,units,values,target,maximumOffTarget:maxOff,ratio:maxOff>0?values[target]/maxOff:null,reason:maxOff===0?'Point estimate has no off-target hits; infinite confinement is not certified.':maxOff===null?'Single-cell cohort has no off-target comparator.':null,
  conservativeExposureRatio:lower&&upper.length>1?lower[target]/Math.max(...upper.filter((_,i)=>i!==target)):null,
  interpretation:'Modality-specific field ratio; not a common energy unit or a recruitment/selectivity guarantee.'};
}
