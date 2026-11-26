// In-memory glTF 2.0 writer and original orthographic illustrations. No external mesh libraries.
const pal={slate:[.43,.48,.63],steel:[.58,.66,.72],gray:[.35,.395,.427],enamel:[.84,.865,.85],rubber:[.078,.096,.115],ink:[.14,.16,.19],silver:[.77,.82,.84],blue:[.085,.29,.41],lamp:[.94,.73,.15],red:[.76,.17,.12],lime:[.28,.65,.39],bolt:[.38,.435,.48],gold:[.91,.68,.18],display:[.11,.26,.34]};
const names=Object.keys(pal);
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),
 cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const m=Math.hypot(...a)||1;return a.map(x=>x/m);};
const orient=(p,a)=>a==='x'?[p[2],p[1],-p[0]]:a==='y'?[p[0],p[2],-p[1]]:p;
function geometry(s){
 const faces=[];
 if(s.t==='box'){
 const [x,y,z]=s.d.map(q=>q*.5);const p=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
 for(const f of [[3,2,1,0],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])faces.push(f.map(i=>{const [x,y,z]=p[i],a=s.a??0;return add(s.p,[x,y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)]);}));;
 }else if(s.t==='chamfer'){
 const [x,y,z]=s.d.map(v=>v/2),e=s.bevel;
 const contour=[[-x+e,-z],[x-e,-z],[x,-z+e],[x,z-e],[x-e,z],[-x+e,z],[-x,z-e],[-x,-z+e]];
 const lo=contour.map(([x,z])=>add(s.p,[x*s.ba,-y,z*s.ba])),hi=contour.map(([x,z])=>add(s.p,[x,y,z]));
 faces.push(lo,hi.slice().reverse());for(let i=0;i<8;i++){const j=(i+1)%8;faces.push([lo[j],lo[i],hi[i],hi[j]]);}
 }else{
 const v=(r,k,z)=>add(s.p,orient([r*Math.cos(k*2*Math.PI/s.n),r*Math.sin(k*2*Math.PI/s.n),z],s.axis));
 const op=s.r,ip=s.r*s.ratio,hi=s.h/2,lo=-hi;
 for(let k=0;k<s.n;k++){
 const j=k+1;
 faces.push([v(op,k,lo),v(op,j,lo),v(op,j,hi),v(op,k,hi)]);
 if(ip){
 faces.push([v(ip,j,lo),v(ip,k,lo),v(ip,k,hi),v(ip,j,hi)]);
 faces.push([v(ip,k,hi),v(op,k,hi),v(op,j,hi),v(ip,j,hi)]);
 faces.push([v(ip,j,lo),v(op,j,lo),v(op,k,lo),v(ip,k,lo)]);
 }else{faces.push([v(0,k,hi),v(op,k,hi),v(op,j,hi)]);faces.push([v(0,k,lo),v(op,j,lo),v(op,k,lo)]);}
 }}
 return faces.map(p=>({p,n:unit(cross(sub(p[1],p[0]),sub(p[2],p[0]))),m:s.m,g:s.g}));
}
export function build(assets,anchors){
 const faces=assets.flatMap(geometry),packs=new Map();
 for(const face of faces){const g=packs.get(face.g)??new Map(),m=g.get(face.m)??[];m.push(face);g.set(face.m,m);packs.set(face.g,g);}
 const scenes=[{nodes:[]}],nodes=[],materials=[],meshes=[],bufferViews=[],accessors=[],parts=[];
 let off=0,triangles=0,draws=0;
 function data(a,ct,target,min,max){
  if(off%4){const n=new Uint8Array(4-off%4);parts.push(n);off+=n.length;}
  const kind=target===34963?'SCALAR':'VEC3',r=new Uint8Array(a.buffer);parts.push(r);const i=bufferViews.length;
  bufferViews.push({buffer:0,byteOffset:off,byteLength:r.length,target});off+=r.length;
  const j=accessors.length;accessors.push({bufferView:i,componentType:ct,count:a.length/(kind==='VEC3'?3:1),type:kind,...(min?{min,max}:{})});return j;
 }
 for(const name of names){const m=pal[name],rgb=m.map(s=>Math.pow(s,2.2));
 materials.push({name,pbrMetallicRoughness:{baseColorFactor:[...rgb,1],metallicFactor:['steel','silver','bolt','gold'].includes(name)?.35:.04,roughnessFactor:['steel','silver','bolt'].includes(name)?.37:.66}});}
 for(const [name,groups] of packs){
  const primitives=[],A=anchors[name],p=A?.at??[0,0,0];
  for(const [mat,fs] of groups){const P=[],N=[],I=[],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
   for(const f of fs){const i=P.length/3;for(const point of f.p){const x=sub(point,p);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],x[k]);hi[k]=Math.max(hi[k],x[k]);}P.push(...x);N.push(...f.n);}
   for(let k=1;k+1<f.p.length;k++)I.push(i,i+k,i+k+1);}
   if(P.length/3>65534)throw Error('Index budget exceeded.');
   primitives.push({attributes:{POSITION:data(new Float32Array(P),5126,34962,lo,hi),NORMAL:data(new Float32Array(N),5126,34962)},indices:data(new Uint16Array(I),5123,34963),material:names.indexOf(mat)});triangles+=I.length/3;draws++;
  } 
  scenes[0].nodes.push(nodes.length);nodes.push({name,mesh:meshes.length,translation:p,...(A?{extras:{action:A.action,label:A.label,anchorM:p,boundsM:A.extent}}:{})});meshes.push({name,primitives});
 }
 const j={asset:{version:'2.0',generator:'BuildTheSimulation original DISCO DAG810 closed exterior'},scene:0,scenes,nodes,meshes,materials,bufferViews,accessors,buffers:[{byteLength:off}]};
 const input=JSON.stringify(j).replace(/[^\x00-\x7f]/g,x=>'\\u'+x.charCodeAt(0).toString(16).padStart(4,'0')),jn=Math.ceil(input.length/4)*4,bn=Math.ceil(off/4)*4;
 const raw=new Uint8Array(28+jn+bn),d=new DataView(raw.buffer);d.setUint32(0,0x46546c67,true);d.setUint32(4,2,true);d.setUint32(8,raw.length,true);d.setUint32(12,jn,true);d.setUint32(16,0x4e4f534a,true);raw.fill(32,20,20+jn);for(let i=0;i<input.length;i++)raw[i+20]=input.charCodeAt(i);d.setUint32(20+jn,bn,true);d.setUint32(24+jn,0x004e4942,true);let ix=28+jn;for(const v of parts){raw.set(v,ix);ix+=v.length;}
 const metrics={triangles,draws,nodes:nodes.length,bytes:raw.length,unit:'m',coordinateFrame:'+X operator right, +Y up, +Z operator-facing',headsetTested:false,anchors};
 return {raw,metrics,faces};
}
export function originalView(faces,view){
 const settings={front:[[.86,.42,2],[.01,.880,.04],205,'DISCO DAG810 sealed exterior and detached diagram desk'],work:[[-.90,.60,1.8],[-.27,.940,.02],208,'Passive enclosure and dark front glazing']};
 const [v0,c,s,title]=settings[view],f=unit(v0),r=unit(cross([0,1,0],f)),u=cross(f,r),w=760,h=450;
 const avail=faces.filter(o=>view!=='work'||!['desk','drawing_screen','key_left','key_center','key_right'].includes(o.g));
 const fn=avail.filter(o=>dot(o.n,f)>.005).map(o=>{
  const xyz=o.p.map(p=>sub(p,c));return {...o,depth:xyz.reduce((a,q)=>a+dot(q,f),0)/xyz.length,poly:xyz.map(p=>[Math.round(w/2+s*dot(p,r)),Math.round(h/2-s*dot(p,u))])};
 }).sort((a,b)=>a.depth-b.depth);
 const path=fn.map(x=>{const i=.61+.39*Math.max(0,dot(x.n,unit([.25,.85,.37]))),col=pal[x.m].map(c=>Math.round(255*c*i));return '<path fill="rgb('+col.join(',')+')" d="M'+x.poly.map(p=>p.join(' ')).join('L')+'Z"/>';}).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="450" viewBox="0 0 760 450" role="img" aria-label="'+title+'"><path fill="#edeae1" d="M0 0h760v450H0z"/>'+path+'<path fill="#edeae1" d="M0 403h760v47H0z"/><text x="19" y="432" fill="#283640" font-size="16" font-family="sans-serif">'+title+'  /  Original metric model</text></svg>\n';
}
