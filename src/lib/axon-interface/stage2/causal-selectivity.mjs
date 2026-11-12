/** Exclusivity is always checked against the complete assigned row, never a
 * row with off-targets removed by the intervention filter. */
export function qualifySelectivity(matrices,cellIds){
 const required=['regionalSilenced','wholeSilenced',...(matrices.opsinBlocked?['opsinBlocked']:[])],exclusive=new Set(),shared=new Set();
 const rows=matrices.assigned.map((row,k)=>{const members=row.flatMap((v,j)=>v?[j]:[]),dependent=members.filter(j=>required.every(c=>matrices[c][k][j]===0));
  if(members.length===1&&dependent.length===1)exclusive.add(dependent[0]);else if(members.length>1)dependent.forEach(j=>shared.add(j));
  return {members:members.map(j=>cellIds[j]),dependentMembers:dependent.map(j=>cellIds[j]),exclusive:members.length===1&&dependent.length===1};
 });
 return {exclusiveCount:exclusive.size,exclusiveIds:[...exclusive].map(j=>cellIds[j]),sharedOnlyCount:[...shared].filter(j=>!exclusive.has(j)).length,sharedOnlyIds:[...shared].filter(j=>!exclusive.has(j)).map(j=>cellIds[j]),criteria:required,rows};
}
