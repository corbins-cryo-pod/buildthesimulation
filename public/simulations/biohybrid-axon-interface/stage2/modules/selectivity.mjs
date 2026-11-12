import {finite,integer,plain,VERSION} from './common.mjs';
const BINARY = x => x===true||x===false||x===0||x===1;
export function binaryMatrix(matrix,name='matrix') {
 if(!Array.isArray(matrix)||matrix.length<1||matrix.length>64||!Array.isArray(matrix[0])||matrix[0].length<1||matrix[0].length>1024) throw new Error(`${name}: require 1–64 channels and 1–1024 outputs; no silent sampling.`);
 const n=matrix[0].length;
 if(matrix.some(r=>!Array.isArray(r)||r.length!==n||!r.every(BINARY))) throw new Error(`${name}: every entry must be an explicit boolean or binary number; null is not non-recruitment.`);
 return matrix.map(row=>row.map(Number));
}
const abs=x=>x<0n?-x:x;
function gcd(a,b) { a=abs(a); b=abs(b); while(b!==0n) [a,b]=[b,a%b]; return a; }
/** Exact rank over R (integer row operations). NOT rank over GF(2). */
export function exactRank(input) {
 const a=binaryMatrix(input).map(r=>r.map(BigInt)),m=a.length,n=a[0].length; let rank=0;
 for(let col=0;col<n&&rank<m;col++) {
  let p=rank; while(p<m&&a[p][col]===0n) p++;
  if(p===m) continue; [a[p],a[rank]]=[a[rank],a[p]];
  for(let row=rank+1;row<m;row++) if(a[row][col]!==0n) {
   const factor=a[row][col], pivot=a[rank][col]; let divisor=0n;
   for(let j=col;j<n;j++) { a[row][j]=pivot*a[row][j]-factor*a[rank][j]; divisor=gcd(divisor,a[row][j]); }
   if(divisor>1n) for(let j=col;j<n;j++) a[row][j]/=divisor;
  }
  rank++;
 }
 return rank;
}
/** I(X;Y) for a deterministic, isolated-channel trial protocol, including off. */
export function isolatedInformation(input,probabilities=null) {
 const a=binaryMatrix(input),patterns=[new Array(a[0].length).fill(0),...a],p=probabilities??patterns.map(()=>1/patterns.length);
 if(!Array.isArray(p)||p.length!==patterns.length||p.some(x=>!Number.isFinite(x)||x<0)||Math.abs(p.reduce((s,x)=>s+x,0)-1)>1e-12) throw new Error('Input probabilities must match off + channels, be nonnegative, and sum to one.');
 const grouped=new Map(); patterns.forEach((r,i)=>{const key=r.join('');grouped.set(key,(grouped.get(key)||0)+p[i]);});
 const entropy=xs=>-xs.reduce((s,x)=>s+(x>0?x*Math.log2(x):0),0);
 return {bitsPerTrial:entropy([...grouped.values()]),inputEntropyBits:entropy(p),conditionalEntropyBits:0,distinctSupportedOutputs:[...grouped.values()].filter(x=>x>0).length,
  inputProbabilities:[...p],protocol:'One channel alone or all channels off; declared probabilities; deterministic saved response per input.',
  interpretation:'Not bits/second, physical communication capacity, a noise-robust estimate, or evidence that simultaneous input combinations superpose.'};
}
function ids(xs,n,prefix) { const out=xs??Array.from({length:n},(_,i)=>prefix+(i+1)); if(!Array.isArray(out)||out.length!==n||out.some(x=>typeof x!=='string'||x.length===0)||new Set(out).size!==n) throw new Error(`${prefix} identities must be unique and complete.`); return [...out]; }
export function analyzeMatrix({assigned,blocked=null,wholeSilenced=null,cellIds=null,channelIds=null,census=null,auditComplete=false,auditValid=false,inputProbabilities=null,provenance='provided matrix'}) {
 const a=binaryMatrix(assigned),m=a.length,n=a[0].length;
 const b=blocked===null?null:binaryMatrix(blocked,'blocked'),w=wholeSilenced===null?null:binaryMatrix(wholeSilenced,'wholeSilenced');
 for(const c of [b,w]) if(c&&(c.length!==m||c[0].length!==n)) throw new Error('Matched controls do not have the same shape.');
 const cells=ids(cellIds,n,'E'),channels=ids(channelIds,m,'C'); census=census??n;integer(census,'original census',n,100000000);
 const members=a.map(r=>r.flatMap((x,i)=>x?[i]:[]));
 const exclusive=new Set(members.filter(r=>r.length===1).map(r=>r[0])),any=new Set(members.flat());
 const causal=new Set(); if(b&&w) for(let k=0;k<m;k++) if(members[k].length===1) {const i=members[k][0];if(!b[k][i]&&!w[k][i]) causal.add(i);}
 const complete=auditComplete===true&&auditValid===true&&b!==null&&w!==null;
 const exclusiveIds=[...exclusive].sort((x,y)=>x-y).map(i=>cells[i]);
 const sharedIds=[...any].filter(i=>!exclusive.has(i)).sort((x,y)=>x-y).map(i=>cells[i]);
 return {schema:'axon-stage2.selectivity.v1',modelVersion:VERSION,provenance,census,resolvedOutputs:n,testedChannels:m,
  audit:{sourceClaimsComplete:auditComplete===true,sourceClaimsValid:auditValid===true,matchedMatricesPresent:b!==null&&w!==null,headlinesEnabled:complete,recalculatedBiologicalControls:false},
  headline:complete?{exclusiveCount:exclusive.size,exclusiveCoverageOfOriginalCensus:exclusive.size/census,exclusiveAmongRecruited:any.size?exclusive.size/any.size:null,sharedOnlyCount:sharedIds.length,
   regionalAndWholeCellDependentExclusiveCount:causal.size}:null,
  descriptive:{exclusiveIds,sharedOnlyIds:sharedIds,anyRecruitedIds:[...any].sort((x,y)=>x-y).map(i=>cells[i]),exactRealRank:exactRank(a),isolatedInputInformation:isolatedInformation(a,inputProbabilities)},
  channelRows:members.map((r,k)=>({channelId:channels[k],members:r.map(i=>cells[i]),exclusive:r.length===1})),
  classifications:b?a.map((row,k)=>row.map((v,i)=>v?(b[k][i]?'persists with block':'lost with block'):(b[k][i]?'appears with block':'silent in both'))):null,
  limitations:['Import checks data structure; it does not rerun or certify the source calculation.','Coverage is conditional on the channels and amplitudes actually tested, not a population-wide design yield.','Exact real-valued rank describes a binary table; it is not a proof of independently commandable patterns for nonlinear neurons.','Lost-with-block is intervention dependence, not proof of the anatomical origin of depolarization.','No original-host preservation or restoration is inferred from introduced-cell recruitment.']};
}
export function analyzeStage1Export(run) {
 if(!run||typeof run!=='object'||!run.settings||!run.geometry||!run.matrices?.assigned) throw new Error('Use a complete Stage 1 result JSON, not a settings-only file or screenshot.');
 if(!Array.isArray(run.geometry.cells)||!Array.isArray(run.geometry.channels)) throw new Error('Missing retained identities.');
 if(run.settings.axonCount!==run.geometry.cells.length||run.settings.channelCount!==run.geometry.channels.length) throw new Error('Settings census/channels disagree with geometry.');
 const x=analyzeMatrix({assigned:run.matrices.assigned,blocked:run.matrices.localSilenced,wholeSilenced:run.matrices.wholeSilenced,cellIds:run.geometry.cells.map(c=>c.id),channelIds:run.geometry.channels.map(c=>c.id),census:run.identities?.originalCensus??run.settings.axonCount,
  auditComplete:run.auditComplete,auditValid:run.auditValid,provenance:'Imported result: structural checks only; not independently rerun.'});
 return {...x,sourceModelVersion:String(run.modelVersion??'unspecified'),completedSettings:plain(run.settings),originalHostEndpoint:run.metrics?.originalHostY??null,
  sourceLimitations:plain(run.limitations??[])};
}
export function analyzeSweep(points) {
 if(!Array.isArray(points)||points.length<2||points.length>64) throw new Error('Sweep needs 2–64 declared points.');
 const first=points.find(p=>p.auditValid===true&&p.assigned)?.assigned; if(!first) throw new Error('No valid matrix in sweep.');
 const shape=binaryMatrix(first); let previous=-Infinity;
 const rows=points.map((p,index)=>{finite(p.amplitude,'amplitude');if(p.amplitude<0||p.amplitude<=previous)throw new Error('Amplitudes must be nonnegative and strictly increasing.');previous=p.amplitude;
  if(p.auditValid!==true||p.failure) return {index,amplitude:p.amplitude,valid:false,failure:p.failure??'audit not valid',matrix:null};
  const matrix=binaryMatrix(p.assigned);if(matrix.length!==shape.length||matrix[0].length!==shape[0].length) throw new Error('Sweep matrix shape changed.');return {index,amplitude:p.amplitude,valid:true,failure:null,matrix};});
 const brackets=shape.map((r,k)=>r.map((_v,i)=>{const rising=[],falling=[],gaps=[];
  for(let j=1;j<rows.length;j++){const a=rows[j-1],b=rows[j];if(!a.valid||!b.valid){gaps.push([a.amplitude,b.amplitude]);continue;}if(!a.matrix[k][i]&&b.matrix[k][i])rising.push([a.amplitude,b.amplitude]);if(a.matrix[k][i]&&!b.matrix[k][i])falling.push([a.amplitude,b.amplitude]);}
  return {rising,falling,unknownIntervals:gaps,nonmonotonicObserved:rising.length>1||falling.length>0};}));
 return {points:rows,brackets,allPointsValid:rows.every(r=>r.valid),interpolation:'none',meaning:'Only adjacent valid samples bracket observed transitions. No interval is bridged across a failed point; unsampled narrow recruitment or block intervals remain unknown.'};
}
