import {sampleStage1Points,STAGE1_FIELD_LIMITS} from '../field-stage1.mjs';

// Stage 2 algebra only: congruent diagonal equilibration and residual-checked
// PCG. Neither a shift nor a regularization is applied to the physical matrix.
const dot=(a,b)=>{let s=0,c=0;for(let i=0;i<a.length;i++){const y=a[i]*b[i]-c,t=s+y;c=(t-s)-y;s=t;}return s;};
function product(A,x,out){
 const {rowPtr,col,values}=A;
 for(let i=0;i<x.length;i++){let s=0;for(let p=rowPtr[i];p<rowPtr[i+1];p++)s+=values[p]*x[col[p]];out[i]=s;}
}
function apply(M,b,out){
 const {ptr,columns,L,d}=M;
 for(let i=0;i<b.length;i++){let v=b[i];for(let p=ptr[i];p<ptr[i+1];p++)v-=L[p]*out[columns[p]];out[i]=v/d[i];}
 for(let i=b.length-1;i>=0;i--){out[i]/=d[i];for(let p=ptr[i];p<ptr[i+1];p++)out[columns[p]]-=L[p]*out[i];}
}
export function solveInductionReference(model,inputLoad,options={}){
 const started=performance.now(),n=model.diag.length,{boundary}=model;
 if(!inputLoad||inputLoad.length!==n)throw new Error('One finite induction load per vertex is required.');
 for(const x of inputLoad)if(!Number.isFinite(x))throw new Error('Nonfinite induction load.');
 if(options.isCancelled?.())throw new Error('Induction calculation cancelled.');
 if((options.boundaryMv??0)!==0)throw new Error('Induction solver requires the declared zero outer boundary.');
 const scale=Float64Array.from(model.diag,(d,i)=>{if(!(d>0&&Number.isFinite(d)))throw new Error('Nonpositive induction diagonal.');return boundary[i]?1:1/Math.sqrt(d);});
 const rowPtr=new Int32Array(n+1),columns=[],entries=[];
 for(let i=0;i<n;i++){
  rowPtr[i]=columns.length;
  if(boundary[i]){columns.push(i);entries.push(1);continue;}
  for(let p=model.rowPtr[i];p<model.rowPtr[i+1];p++)if(!boundary[model.col[p]]&&model.values[p]!==0){columns.push(model.col[p]);entries.push(model.values[p]*scale[i]*scale[model.col[p]]);}
 }rowPtr[n]=columns.length;
 const A={rowPtr,col:Int32Array.from(columns),values:Float64Array.from(entries),diag:new Float64Array(n).fill(1)},M=axialFactor(A,model);
 const b=Float64Array.from(inputLoad,(v,i)=>boundary[i]?0:v*scale[i]),x=new Float64Array(n),xLow=new Float64Array(n),r=Float64Array.from(b),z=new Float64Array(n),p=new Float64Array(n),Ap=new Float64Array(n),physical=new Float64Array(n),physicalResidual=new Float64Array(n),physicalLow=new Float64Array(n);
 const bn=Math.sqrt(dot(b,b)),physicalBn=Math.sqrt(Array.from(inputLoad,(v,i)=>boundary[i]?0:v*v).reduce((a,b)=>a+b,0));
 const residual=()=>{
  for(let i=0;i<n;i++){const p=x[i]*scale[i],e=productError(x[i],scale[i],p)+xLow[i]*scale[i],h=p+e;physical[i]=h;physicalLow[i]=e-(h-p);}
  // Two-component physical state and error-free products make the observed
  // residual a property of the original matrix, not of cancellation rounding.
  for(let i=0;i<n;i++)if(!boundary[i]){
   let hi=-inputLoad[i],lo=0;
   for(let q=model.rowPtr[i];q<model.rowPtr[i+1];q++){
    const c=model.col[q],k=model.values[q],p=k*physical[c],t=hi+p;
    lo+=(Math.abs(hi)>=Math.abs(p)?(hi-t)+p:(p-t)+hi)+productError(k,physical[c],p)+k*physicalLow[c];hi=t;
   }
   physicalResidual[i]=-(hi+lo);
  }
  const err=Math.sqrt(dot(physicalResidual,physicalResidual));return physicalBn?err/physicalBn:err;
 };
 apply(M,r,z);p.set(z);let rz=dot(r,z),iterations=0,restarts=0,trueResidual=residual(),recurrence=bn?Math.sqrt(dot(r,r))/bn:0;
 while((trueResidual>1e-10||recurrence>STAGE1_FIELD_LIMITS.relativeTolerance)&&iterations<STAGE1_FIELD_LIMITS.maxIterations){
  if(options.isCancelled?.())throw new Error('Induction calculation cancelled.');
  product(A,p,Ap);const curvature=dot(p,Ap);if(!(curvature>0&&Number.isFinite(curvature)))throw new Error('Induction PCG lost positive curvature.');
  const alpha=rz/curvature;for(let i=0;i<n;i++){const v=alpha*p[i],e=productError(alpha,p[i],v),t=x[i]+v,low=xLow[i]+e+(Math.abs(x[i])>=Math.abs(v)?(x[i]-t)+v:(v-t)+x[i]),hi=t+low;xLow[i]=low-(hi-t);x[i]=hi;r[i]-=alpha*Ap[i];}iterations++;
  recurrence=bn?Math.sqrt(dot(r,r))/bn:0;
  // Observation does not overwrite the Krylov residual or break conjugacy.
  if(iterations%100===0||recurrence<=STAGE1_FIELD_LIMITS.relativeTolerance){
   trueResidual=residual();options.onProgress?.({iterations,relativeResidual:trueResidual,recurrenceResidual:recurrence});
   if(trueResidual<=1e-10&&recurrence<=STAGE1_FIELD_LIMITS.relativeTolerance)break;
  }
  if(recurrence<=STAGE1_FIELD_LIMITS.relativeTolerance){
   // Iterative refinement uses the original physical residual. Recomputing
   // only b-A_scaled*x can stagnate at the rounding error introduced when
   // storing the congruently scaled coefficients. Restart preserves PCG.
   for(let i=0;i<n;i++)r[i]=physicalResidual[i]*scale[i];
   recurrence=bn?Math.sqrt(dot(r,r))/bn:0;apply(M,r,z);p.set(z);rz=dot(r,z);restarts++;continue;
  }
  apply(M,r,z);const next=dot(r,z),beta=next/rz;for(let i=0;i<n;i++)p[i]=z[i]+beta*p[i];rz=next;
 }
 trueResidual=residual();if(trueResidual>1e-10||recurrence>STAGE1_FIELD_LIMITS.relativeTolerance||physical.some(x=>!Number.isFinite(x)))throw new Error(`Induction fixed true residual gate failed (${trueResidual}, ${iterations} iterations, ${restarts} restarts, recurrence ${recurrence})`);
 let injected=0,reaction=0,interior=0;
 for(let i=0;i<n;i++){let v=0;for(let q=model.rowPtr[i];q<model.rowPtr[i+1];q++)v+=model.values[q]*physical[model.col[q]];injected+=inputLoad[i];if(boundary[i])reaction+=v-inputLoad[i];else interior+=v-inputLoad[i];}
 const solution={model,potentialMvPerUa:Float64Array.from(physical,v=>1000*v),potentialLowMvPerUa:Float64Array.from(physicalLow,v=>1000*v),loadUa:Float64Array.from(inputLoad),diagnostics:{...model.diagnostics,iterations,relativeResidual:trueResidual,recurrenceResidual:recurrence,restarts,sourceReturnImbalanceUa:injected,boundaryReactionUa:reaction,globalCurrentClosureUa:reaction+injected,summedInteriorResidualUa:interior,preconditioner:{kind:'exact axial-column block Cholesky; two-component solution and residual',diagonalShift:M.shift,failedShifts:M.failed},solveSeconds:(performance.now()-started)/1000}};
 solution.sample=points=>sampleStage1Points(solution,points);return solution;
}

function axialFactor(A,model){
 const C=model.crossSection.points.length,n=A.diag.length,raw=new Int32Array(n);
 for(let i=0;i<model.rawToActive.length;i++)if(model.rawToActive[i]>=0)raw[model.rawToActive[i]]=i;
 const ptr=new Int32Array(n+1),columns=[],lower=[],d=new Float64Array(n);
 for(let i=0;i<n;i++){
  ptr[i]=columns.length;let diagonal=1;
  const j=raw[i]>=C?model.rawToActive[raw[i]-C]:-1;
  if(!model.boundary[i]&&j>=0&&!model.boundary[j]){
   let v=0;for(let p=A.rowPtr[i];p<A.rowPtr[i+1];p++)if(A.col[p]===j){v=A.values[p];break;}
   if(v){const L=v/d[j];columns.push(j);lower.push(L);diagonal-=L*L;}
  }
  if(!(diagonal>0))throw new Error('Nonpositive axial-block pivot at '+i);
  d[i]=Math.sqrt(diagonal);
 }
 ptr[n]=columns.length;return {ptr,columns:Int32Array.from(columns),L:Float64Array.from(lower),d,shift:0,failed:[]};
}

function productError(a,b,p){const split=134217729,sa=split*a,sb=split*b,ah=sa-(sa-a),bh=sb-(sb-b),al=a-ah,bl=b-bh;return ((ah*bh-p)+ah*bl+al*bh)+al*bl;}
