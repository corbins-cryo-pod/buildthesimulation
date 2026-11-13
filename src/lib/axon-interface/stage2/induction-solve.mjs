import {sampleStage1Points,STAGE1_FIELD_LIMITS} from '../field-stage1.mjs';

// Stage 2 algebra only: congruent diagonal equilibration and residual-checked
// PCG. Neither a shift nor a regularization is applied to the physical matrix.
const dot=(a,b)=>{let s=0,c=0;for(let i=0;i<a.length;i++){const y=a[i]*b[i]-c,t=s+y;c=(t-s)-y;s=t;}return s;};
function product(A,x,out){
 const {rowPtr,col,values}=A;
 for(let i=0;i<x.length;i++){let s=0;for(let p=rowPtr[i];p<rowPtr[i+1];p++)s+=values[p]*x[col[p]];out[i]=s;}
}
function factor(A){
 const {rowPtr,col,values,diag}=A,n=diag.length,ptr=new Int32Array(n+1);let count=0;
 for(let i=0;i<n;i++){ptr[i]=count;for(let p=rowPtr[i];p<rowPtr[i+1]&&col[p]<i;p++)count++;}ptr[n]=count;
 const columns=new Int32Array(count),original=new Float64Array(count);
 for(let i=0;i<n;i++){let j=ptr[i];for(let p=rowPtr[i];p<rowPtr[i+1]&&col[p]<i;p++){columns[j]=col[p];original[j++]=values[p];}}
 const failed=[];
 for(const shift of [0,1e-8,1e-6,1e-4,.001,.01,.1,1]){
  const L=Float64Array.from(original),d=new Float64Array(n);let bad=-1;
  for(let i=0;i<n;i++){
   let diagonal=diag[i]*(1+shift);
   for(let p=ptr[i];p<ptr[i+1];p++){
    const j=columns[p];let a=ptr[i],b=ptr[j],v=L[p];
    while(a<p&&b<ptr[j+1]){const u=columns[a],w=columns[b];if(u===w){v-=L[a++]*L[b++];}else if(u<w)a++;else b++;}
    v/=d[j];L[p]=v;diagonal-=v*v;
   }
   if(!(diagonal>0)||!Number.isFinite(diagonal)){bad=i;break;}d[i]=Math.sqrt(diagonal);
  }
  if(bad<0)return {ptr,columns,L,d,shift,failed};failed.push({shift,firstNonPositivePivot:bad});
 }
 throw new Error('Induction IC(0) construction failed at every declared shift.');
}
function apply(M,b,out){
 const {ptr,columns,L,d}=M;
 for(let i=0;i<b.length;i++){let v=b[i];for(let p=ptr[i];p<ptr[i+1];p++)v-=L[p]*out[columns[p]];out[i]=v/d[i];}
 for(let i=b.length-1;i>=0;i--){out[i]/=d[i];for(let p=ptr[i];p<ptr[i+1];p++)out[columns[p]]-=L[p]*out[i];}
}
export function solveInductionLoad(model,inputLoad,options={}){
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
 const A={rowPtr,col:Int32Array.from(columns),values:Float64Array.from(entries),diag:new Float64Array(n).fill(1)},M=factor(A);
 const b=Float64Array.from(inputLoad,(v,i)=>boundary[i]?0:v*scale[i]),x=new Float64Array(n),r=Float64Array.from(b),z=new Float64Array(n),p=new Float64Array(n),Ap=new Float64Array(n),physical=new Float64Array(n),physicalResidual=new Float64Array(n);
 const bn=Math.sqrt(dot(b,b)),physicalBn=Math.sqrt(Array.from(inputLoad,(v,i)=>boundary[i]?0:v*v).reduce((a,b)=>a+b,0));
 const residual=()=>{
  for(let i=0;i<n;i++)physical[i]=x[i]*scale[i];
  // Compensated summation observes the ORIGINAL matrix, including the thin
  // interface rows where large opposing terms nearly cancel. No coefficient
  // or tolerance is changed to reduce the reported residual.
  for(let i=0;i<n;i++)if(!boundary[i]){let sum=0,c=0;for(let q=model.rowPtr[i];q<model.rowPtr[i+1];q++){const y=model.values[q]*physical[model.col[q]]-c,t=sum+y;c=(t-sum)-y;sum=t;}physicalResidual[i]=inputLoad[i]-sum;}
  const err=Math.sqrt(dot(physicalResidual,physicalResidual));return physicalBn?err/physicalBn:err;
 };
 apply(M,r,z);p.set(z);let rz=dot(r,z),iterations=0,restarts=0,trueResidual=residual(),recurrence=bn?Math.sqrt(dot(r,r))/bn:0;
 while((trueResidual>1e-10||recurrence>STAGE1_FIELD_LIMITS.relativeTolerance)&&iterations<STAGE1_FIELD_LIMITS.maxIterations){
  if(options.isCancelled?.())throw new Error('Induction calculation cancelled.');
  product(A,p,Ap);const curvature=dot(p,Ap);if(!(curvature>0&&Number.isFinite(curvature)))throw new Error('Induction PCG lost positive curvature.');
  const alpha=rz/curvature;for(let i=0;i<n;i++){x[i]+=alpha*p[i];r[i]-=alpha*Ap[i];}iterations++;
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
 const solution={model,potentialMvPerUa:Float64Array.from(physical,v=>1000*v),loadUa:Float64Array.from(inputLoad),diagnostics:{...model.diagnostics,iterations,relativeResidual:trueResidual,recurrenceResidual:recurrence,restarts,sourceReturnImbalanceUa:injected,boundaryReactionUa:reaction,globalCurrentClosureUa:reaction+injected,summedInteriorResidualUa:interior,preconditioner:{kind:'symmetrically equilibrated IC(0)',diagonalShift:M.shift,failedShifts:M.failed},solveSeconds:(performance.now()-started)/1000}};
 solution.sample=points=>sampleStage1Points(solution,points);return solution;
}
