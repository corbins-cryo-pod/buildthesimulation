import test from 'node:test';
import assert from 'node:assert/strict';
import {solveInductionLoad} from '../src/lib/axon-interface/stage2/induction-solve.mjs';
import {tetrahedronRule,vectorPotentialSampler} from '../src/lib/axon-interface/stage2/induction-quadrature.mjs';

// A congruently scaled finite-volume Laplacian with a known manufactured
// potential. This checks the physical equation, not a second PCG recurrence.
function fixture(n=81){
 const scale=Float64Array.from({length:n},(_,i)=>10**(6*i/(n-1))),rowPtr=new Int32Array(n+1),col=[],values=[],diag=new Float64Array(n),boundary=new Uint8Array(n);
 boundary[0]=boundary[n-1]=1;
 for(let i=0;i<n;i++){rowPtr[i]=col.length;for(let j=Math.max(0,i-1);j<=Math.min(n-1,i+1);j++){const v=(i===j?2:-1)*scale[i]*scale[j];col.push(j);values.push(v);if(i===j)diag[i]=v;}}rowPtr[n]=col.length;
 const expected=Float64Array.from({length:n},(_,i)=>boundary[i]?0:Math.sin(Math.PI*i/(n-1))/scale[i]),rhs=new Float64Array(n);
 for(let i=0;i<n;i++)for(let q=rowPtr[i];q<rowPtr[i+1];q++)rhs[i]+=values[q]*expected[col[q]];
 return {model:{diag,boundary,rowPtr,col:Int32Array.from(col),values:Float64Array.from(values),diagnostics:{}},expected,rhs};
}
test('Equilibration solves the original strongly scaled equation and boundary reactions',()=>{
 const {model,expected,rhs}=fixture(),copy=Array.from(model.values),s=solveInductionLoad(model,rhs);
 let e=0,q=0;for(let i=0;i<expected.length;i++){e+=(s.potentialMvPerUa[i]/1000-expected[i])**2;q+=expected[i]**2;}
 assert.ok(Math.sqrt(e/q)<1e-10);assert.ok(s.diagnostics.relativeResidual<=1e-10);assert.ok(s.diagnostics.recurrenceResidual<=2e-12);
 assert.deepEqual(Array.from(model.values),copy);assert.equal(s.potentialMvPerUa[0],0);assert.equal(s.potentialMvPerUa.at(-1),0);
});
test('Induction solve preserves zero input and linear sign/amplitude scaling',()=>{
 const {model,rhs}=fixture(),a=solveInductionLoad(model,rhs),b=solveInductionLoad(model,Float64Array.from(rhs,x=>-7*x)),zero=solveInductionLoad(model,new Float64Array(rhs.length));
 assert.ok(zero.potentialMvPerUa.every(x=>x===0));assert.equal(zero.diagnostics.iterations,0);
 for(let i=0;i<rhs.length;i++)assert.ok(Math.abs(b.potentialMvPerUa[i]+7*a.potentialMvPerUa[i])<1e-8);
});
test('Invalid induction input and cancellation cannot return a partial solution',()=>{
 const {model,rhs}=fixture();assert.throws(()=>solveInductionLoad(model,[0]),/load/);assert.throws(()=>solveInductionLoad(model,Float64Array.from(rhs,()=>NaN)),/Nonfinite/);
 assert.throws(()=>solveInductionLoad(model,rhs,{boundaryMv:1}),/zero outer boundary/);
 assert.throws(()=>solveInductionLoad(model,rhs,{isCancelled:()=>true}),/cancelled/);
});
test('Tetrahedral source quadrature integrates every claimed barycentric moment',()=>{
 const factorial=n=>n<=1?1:n*factorial(n-1);
 for(const [rule,degree] of [['vertex',1],['centroid',1],['tetra4',2],['tetra11',4]]){
  const points=tetrahedronRule(rule);
  for(const {point} of points){assert.ok(point.every(x=>x>=0&&x<=1));assert.ok(Math.abs(point.reduce((a,b)=>a+b,0)-1)<1e-14);}
  for(let a=0;a<=degree;a++)for(let b=0;b<=degree-a;b++)for(let c=0;c<=degree-a-b;c++)for(let d=0;d<=degree-a-b-c;d++){
   const powers=[a,b,c,d],exact=6*powers.reduce((v,n)=>v*factorial(n),1)/factorial(3+a+b+c+d);
   const actual=points.reduce((sum,{point,weight})=>sum+weight*point.reduce((v,x,i)=>v*x**powers[i],1),0);
   assert.ok(Math.abs(actual-exact)<1e-14,`${rule} moment ${powers}: ${actual} != ${exact}`);
  }
 }
});
test('Finite-segment vector potential matches the analytic perpendicular-bisector integral',()=>{
 const L=.002,r=.0003,sample=vectorPotentialSampler({segments:[{a:[0,0,-L/2],b:[0,0,L/2],exclusionRadiusM:1e-5}]}),A=sample(r,0,0,[0,0,0]);
 assert.equal(A[0],0);assert.equal(A[1],0);assert.ok(Math.abs(A[2]-2e-7*Math.asinh(L/(2*r)))<1e-20);
 assert.throws(()=>sample(0,0,0,[0,0,0]),/conductor/);
});
