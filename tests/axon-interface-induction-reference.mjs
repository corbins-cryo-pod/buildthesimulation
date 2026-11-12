import test from 'node:test';import assert from 'node:assert/strict';
import {solveInductionReference} from '../scripts/axon-interface/stage2/induction-refinement-solve.mjs';
function manufactured(){
 const C=3,Z=31,n=C*Z,points=Array.from({length:n},(_,i)=>[i%C,0,Math.floor(i/C)]),boundary=Uint8Array.from(points,p=>Number(p[2]===0||p[2]===Z-1)),rowPtr=new Int32Array(n+1),col=[],values=[],diag=new Float64Array(n),rawToActive=Int32Array.from({length:n},(_,i)=>i);
 const edge=z=>z===14?2**40:1,expected=Float64Array.from(points,([x,,z])=>(x+1)*(z===15?14*(30-14):z*(30-z))*(z===0||z===30?0:1));
 for(let i=0;i<n;i++){const x=i%C,z=Math.floor(i/C),row=[];rowPtr[i]=col.length;let d=2;
  if(z>0){row.push([i-C,-edge(z-1)]);d+=edge(z-1);}if(z<Z-1){row.push([i+C,-edge(z)]);d+=edge(z);}
  if(x>0)row.push([i-1,-1]);if(x<C-1)row.push([i+1,-1]);row.push([i,d]);diag[i]=d;
  for(const [j,v] of row.sort((a,b)=>a[0]-b[0])){col.push(j);values.push(v);}
 }rowPtr[n]=col.length;
 const rhs=new Float64Array(n);for(let i=0;i<n;i++)for(let p=rowPtr[i];p<rowPtr[i+1];p++)rhs[i]+=values[p]*expected[col[p]];
 return {expected,rhs,model:{points,boundary,rowPtr,col:Int32Array.from(col),values:Float64Array.from(values),diag,rawToActive,crossSection:{points:points.slice(0,C)},diagnostics:{}}};
}
test('Extended reference solves a manufactured thin-layer system without changing its matrix',()=>{
 const {model,rhs,expected}=manufactured(),original=Array.from(model.values),r=solveInductionReference(model,rhs);
 const relative=Math.hypot(...expected.map((v,i)=>(r.potentialMvPerUa[i]+r.potentialLowMvPerUa[i])/1000-v))/Math.hypot(...expected);
 assert.ok(relative<1e-8,relative);assert.ok(r.diagnostics.relativeResidual<=1e-10);assert.ok(r.diagnostics.recurrenceResidual<=2e-12);assert.deepEqual(Array.from(model.values),original);
});
test('Extended reference preserves zero input and rejects cancelled or malformed solves',()=>{
 const {model,rhs}=manufactured(),r=solveInductionReference(model,new Float64Array(rhs.length));
 assert.ok(r.potentialMvPerUa.every(x=>x===0));assert.ok(r.potentialLowMvPerUa.every(x=>x===0));assert.throws(()=>solveInductionReference(model,rhs,{isCancelled:()=>true}),/cancelled/);assert.throws(()=>solveInductionReference(model,[0]),/load/);
});
