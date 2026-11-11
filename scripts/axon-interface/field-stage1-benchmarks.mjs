/** Independent small analytic benchmark meshes, not production geometry. */
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function dot(a,b){return a.reduce((s,v,i)=>s+v*b[i],0);}
export function cylinderBenchmark({radii,axial,angles=32,sigma=.3,boundary}){
 const p2=[],rings=[];
 for(const r of radii){if(r===0){rings.push([p2.length]);p2.push([0,0]);}else{rings.push(Array.from({length:angles},(_,j)=>{const id=p2.length;p2.push([r*Math.cos(2*Math.PI*j/angles),r*Math.sin(2*Math.PI*j/angles)]);return id;}));}}
 const tri=[];for(let k=1;k<rings.length;k++)for(let j=0;j<angles;j++){
  const a=rings[k-1],b=rings[k],l=(j+1)%angles;
  if(a.length===1)tri.push([a[0],b[j],b[l]]);else tri.push([a[j],b[j],b[l]],[a[j],b[l],a[l]]);
 }
 const points=axial.flatMap(z=>p2.map(p=>[...p,z])),rows=points.map(()=>new Map()),tetrahedra=[];
 for(let z=0;z<axial.length-1;z++)for(const t of tri){
  const [a,b,c]=[...t].sort((a,b)=>a-b).map(i=>i+z*p2.length),A=a+p2.length,B=b+p2.length,C=c+p2.length;
  for(const ids of [[a,b,c,A],[b,c,A,B],[c,A,B,C]]){
   tetrahedra.push(ids);const [p,q,r,s]=ids.map(i=>points[i]),u=q.map((v,k)=>v-p[k]),v=r.map((v,k)=>v-p[k]),w=s.map((v,k)=>v-p[k]);
   const vw=cross(v,w),wu=cross(w,u),uv=cross(u,v),d=dot(u,vw),volume=Math.abs(d)/6;
   const g=[vw.map(v=>v/d),wu.map(v=>v/d),uv.map(v=>v/d)];g.unshift(g[0].map((v,k)=>-v-g[1][k]-g[2][k]));
   for(let i=0;i<4;i++)for(let j=0;j<4;j++)rows[ids[i]].set(ids[j],(rows[ids[i]].get(ids[j])??0)+volume*sigma*dot(g[i],g[j]));
  }
 }
 const rowPtr=new Int32Array(points.length+1),columns=[],values=[],diag=new Float64Array(points.length);
 for(let i=0;i<points.length;i++){rowPtr[i]=columns.length;for(const [j,v]of [...rows[i]].sort((a,b)=>a[0]-b[0])){columns.push(j);values.push(v);if(j===i)diag[i]=v;}}rowPtr[points.length]=columns.length;
 return {points,rowPtr,col:Int32Array.from(columns),values:Float64Array.from(values),diag,boundary:points.map(boundary),geometry:{constructPresent:true},diagnostics:{benchmarkOnly:true,nodes:points.length,tetrahedra:tetrahedra.length}};
}
export function boundaryReaction(model,solution,predicate){
 const volts=Float64Array.from(solution.potentialMvPerUa,v=>v/1000);let total=0;
 for(let i=0;i<model.points.length;i++)if(predicate(model.points[i]))for(let p=model.rowPtr[i];p<model.rowPtr[i+1];p++)total+=model.values[p]*volts[model.col[p]];
 return total;
}
