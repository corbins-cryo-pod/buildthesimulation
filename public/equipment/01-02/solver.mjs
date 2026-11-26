// Independent finite-volume teaching solve; uniform inert conductor. No OEM solver or biological model.
export const schema='bts.neutral-slab-ohmic.v1';
export const defaults=()=>({sampleId:'uniform-slab-01',lengthMm:40,heightMm:20,depthMm:10,sigmaSm:2,leftV:5,rightV:0,nx:16});
export const initial=()=>({config:defaults(),result:null,error:'',revision:0});
const req=(x,e)=>{if(!x)throw Error(e)},inR=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function validate(c){
 req(c&&typeof c.sampleId==='string'&&c.sampleId.trim()&&c.sampleId.length<=96,'Enter a slab identifier.');
 req([c.lengthMm,c.heightMm,c.depthMm].every(x=>inR(x,5,120)),'Use positive slab dimensions 5–120 mm.');
 req(inR(c.sigmaSm,.01,10),'Conductivity must be 0.01–10 S/m.');
 req(inR(c.leftV,-20,20)&&inR(c.rightV,-20,20),'Electrode potentials must be within ±20 V.');
 req([8,16,32,64].includes(c.nx),'Choose 8, 16, 32 or 64 X subdivisions.');
}
const inner=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function grid(c,nx){
 const L=c.lengthMm/1000,H=c.heightMm/1000,D=c.depthMm/1000,A=H*D,dx=L/nx,ny=Math.min(32,Math.max(4,Math.round(nx*H/L))),dy=H/ny,nn=(nx-1)*ny,N=nx-1,w=dx*dx/(dy*dy);
 const b=new Float64Array(nn),x=new Float64Array(nn),q=new Float64Array(nn);
 for(let j=0;j<ny;j++){b[j*N]=c.leftV;b[j*N+N-1]=c.rightV;}
 function apply(p){
  for(let j=0;j<ny;j++)for(let i=0;i<N;i++){
   const k=j*N+i;let g=2*p[k]-(i?p[k-1]:0)-(i<N-1?p[k+1]:0);
   if(j)g+=w*(p[k]-p[k-N]);if(j<ny-1)g+=w*(p[k]-p[k+N]);q[k]=g;
  }
 }
 const r=b.slice(),p=r.slice(),normal=Math.max(Math.sqrt(inner(b,b)),1),le=1e-11;
 let rr=inner(r,r),iterations=0;
 while(Math.sqrt(rr)/normal>le&&iterations<4000){
  apply(p);const a=rr/inner(p,q);for(let k=0;k<nn;k++){x[k]+=a*p[k];r[k]-=a*q[k];}
  const next=inner(r,r);for(let k=0;k<nn;k++)p[k]=r[k]+next/rr*p[k];rr=next;iterations++;
 }
 apply(x);let norm2=0;for(let k=0;k<nn;k++)norm2+=(q[k]-b[k])**2;
 const relativeResidual=Math.sqrt(norm2)/normal;
 req(relativeResidual<2e-9,'Mesh did not converge; choose a coarser grid or balanced aspect ratio.');
 const V=(i,j)=>i===0?c.leftV:i===nx?c.rightV:x[j*N+i-1],expect=c.sigmaSm*A*(c.leftV-c.rightV)/L,ptr=[];
 let curL=0,curR=0,maxPotentialErrorV=0;
 for(let j=0;j<ny;j++){
  curL+=c.sigmaSm*(V(0,j)-V(1,j))*dy*D/dx;curR+=c.sigmaSm*(V(nx-1,j)-V(nx,j))*dy*D/dx;
  for(let i=0;i<=nx;i++){
   const k=V(i,j),from=Math.max(0,i-1),to=Math.min(nx,i+1),electricXVm=(V(from,j)-V(to,j))/((to-from)*dx),posX=i*dx;
   ptr.push({xM:posX,yM:(j+.5)*dy,potentialV:k,electricXVm,currentDensityAm2:c.sigmaSm*electricXVm});
   maxPotentialErrorV=Math.max(maxPotentialErrorV,Math.abs(k-(c.leftV+(c.rightV-c.leftV)*i/nx)));
  }
 }
 const currentA=(curL+curR)/2;
 return {mesh:{nx,ny,dxM:dx,dyM:dy,uniformDepthM:D,areaM2:A},points:ptr,total:{currentA,leftFluxA:curL,rightFluxA:curR,exactCurrentA:expect,currentErrorA:Math.abs(currentA-expect),imbalanceA:Math.abs(curL-curR),maxPotentialErrorV,centerV:V(nx/2,Math.floor(ny/2))},solver:{iterations,relativeResidual}};
}
export function solve(c,inputRevision=0){
 validate(c);req(Number.isSafeInteger(inputRevision)&&inputRevision>=0,'Invalid revision.');
 const b=grid(c,c.nx),study=[8,16,32].map(n=>{const r=n===c.nx?b:grid(c,n);return {nx:n,ny:r.mesh.ny,relativeResidual:r.solver.relativeResidual,iterations:r.solver.iterations,currentErrorA:r.total.currentErrorA,maxPotentialErrorV:r.total.maxPotentialErrorV};});
 return {schema,deviceId:'01-02',kind:'simulated',sampleId:c.sampleId,inputRevision,revision:inputRevision+1,configuration:{...c},boundary:{left:'fixed potential',right:'fixed potential',sides:'zero normal current',positiveCurrent:'+X'},units:{xM:'m',yM:'m',potentialV:'V',electricXVm:'V/m',currentDensityAm2:'A/m²',currentA:'A'},...b,study,provenance:{method:'uniform finite-volume discretization with conjugate gradients; homogeneous inert conductor',measuredHardware:false,history:[{deviceId:'01-02',operation:'ohmic field solve',parentRevision:inputRevision,resultRevision:inputRevision+1}]}};
}
export function act(s,id,p){
 const idle={...s,result:null,error:''};
 if(id==='reset')return initial();
 if(id==='grid'){const n=[8,16,32,64];return act(s,'set',{nx:n[(n.indexOf(s.config.nx)+1)%n.length]});}
 if(id==='reverse')return act(s,'set',{leftV:s.config.rightV,rightV:s.config.leftV});
 if(id==='set')return {...idle,config:{...s.config,...p},revision:p.sampleId!==undefined&&p.sampleId!==s.config.sampleId?0:s.revision};
 if(id==='run'){try{const result=solve(s.config,s.revision);return {...s,result,error:'',revision:result.revision};}catch(e){return {...idle,error:e.message};}}
 throw Error('Unknown workstation action');
}
export function csv(r){const q=x=>'"'+String(x).replace(/"/g,'""')+'"',keys=Object.keys(r.points[0]);return ['sampleId,revision,kind,'+keys.join(','),...r.points.map(p=>[q(r.sampleId),r.revision,r.kind,...keys.map(k=>p[k])].join(','))].join('\n')+'\n';}
