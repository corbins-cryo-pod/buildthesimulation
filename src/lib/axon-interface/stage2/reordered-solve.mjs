import {solveStage1Load,sampleStage1Points} from '../field-stage1.mjs';
/** Symmetric reverse Cuthill–McKee ordering changes only algebraic ordering.
 * The original stiffness coefficients, load, geometry and fixed residual gate
 * are preserved. No physical diagonal regularization is introduced. */
export function reverseCuthillMcKee(model){
 const n=model.diag.length,degree=Array.from({length:n},(_,i)=>model.rowPtr[i+1]-model.rowPtr[i]-1),seen=new Uint8Array(n),queue=new Int32Array(n),order=[];
 const starts=Array.from({length:n},(_,i)=>i).sort((a,b)=>degree[a]-degree[b]||a-b);
 for(const start of starts){if(seen[start])continue;let head=0,tail=1;queue[0]=start;seen[start]=1;
  while(head<tail){const i=queue[head++];order.push(i);const neighbors=[];for(let p=model.rowPtr[i];p<model.rowPtr[i+1];p++){const j=model.col[p];if(j!==i&&!seen[j])neighbors.push(j);}
   neighbors.sort((a,b)=>degree[a]-degree[b]||a-b);for(const j of neighbors)if(!seen[j]){seen[j]=1;queue[tail++]=j;}
  }
 }return Int32Array.from(order.reverse());
}
export function solveReorderedLoad(model,load,options={}){
 const start=performance.now(),order=reverseCuthillMcKee(model),n=order.length,inverse=new Int32Array(n);for(let i=0;i<n;i++)inverse[order[i]]=i;
 const rowPtr=new Int32Array(n+1),col=new Int32Array(model.col.length),values=new Float64Array(col.length);let p=0;
 for(let i=0;i<n;i++){rowPtr[i]=p;const old=order[i],entries=[];for(let q=model.rowPtr[old];q<model.rowPtr[old+1];q++)entries.push([inverse[model.col[q]],model.values[q]]);entries.sort((a,b)=>a[0]-b[0]);for(const [j,v]of entries){col[p]=j;values[p++]=v;}}rowPtr[n]=p;
 const reordered={...model,points:Array.from(order,i=>model.points[i]),boundary:Uint8Array.from(order,i=>model.boundary[i]),diag:Float64Array.from(order,i=>model.diag[i]),rowPtr,col,values,preconditioner:null};
 const permutationSeconds=(performance.now()-start)/1000;
 const result=solveStage1Load(reordered,Float64Array.from(order,i=>load[i]),options),potential=new Float64Array(n);for(let i=0;i<n;i++)potential[order[i]]=result.potentialMvPerUa[i];
 const solution={...result,model,potentialMvPerUa:potential,loadUa:Float64Array.from(load),diagnostics:{...result.diagnostics,algebraicOrdering:'symmetric reverse Cuthill–McKee',permutationSeconds}};
 solution.sample=points=>sampleStage1Points(solution,points);return solution;
}
