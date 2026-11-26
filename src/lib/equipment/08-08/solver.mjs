// Passive package perimeter alignment; no source model, machine motion, weld quality or leak prediction.
export const schema='bts.package-seam-fit.v1',edges=['north','east','south','west'];
export const defaults=()=>({sampleId:'inert-package-rect-01',widthMm:20,heightMm:12,shiftXmm:0,shiftYmm:0,yawDeg:0,bandMm:.1,missingEdge:'none'});
export const initial=()=>({config:defaults(),fixture:true,door:false,result:null,error:'',revision:0});
const req=(v,m)=>{if(!v)throw Error(m)},inR=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function validate(c){
 req(c&&typeof c.sampleId==='string'&&c.sampleId.trim()&&c.sampleId.length<=96,'Enter an inert package ID.');
 req(inR(c.widthMm,4,60)&&inR(c.heightMm,4,60),'Package width and height must be 4–60 mm.');
 req(inR(c.shiftXmm,-4,4)&&inR(c.shiftYmm,-4,4)&&inR(c.yawDeg,-22,22),'Translation or rotation outside the virtual inspection slab.');
 req(inR(c.bandMm,.025,1)&&['none',...edges].includes(c.missingEdge),'Choose 0.025–1 mm alignment band and a known edge selection.');
}
function clip(v,m,low,high,t){
 if(!t)return null;if(Math.abs(m)<1e-14)return v>=low-1e-13&&v<=high+1e-13?t:null;
 let a=(low-v)/m,b=(high-v)/m;if(a>b)[a,b]=[b,a];const lo=Math.max(a,t[0]),hi=Math.min(b,t[1]);return hi>=lo?[lo,hi]:null;
}
export function solve(c,inputRevision=0){
 validate(c);req(Number.isSafeInteger(inputRevision)&&inputRevision>=0,'Invalid measurement revision.');
 const x=c.widthMm/2,y=c.heightMm/2,corners=[[-x,y],[x,y],[x,-y],[-x,-y]],a=c.yawDeg*Math.PI/180,C=Math.cos(a),S=Math.sin(a);
 const pose=([x,y])=>[C*x-S*y+c.shiftXmm,S*x+C*y+c.shiftYmm],dot=(q,r)=>q[0]*r[0]+q[1]*r[1],sub=(q,r)=>[q[0]-r[0],q[1]-r[1]];
 const spans=edges.map((id,i)=>{
  const start=corners[i],end=corners[(i+1)%4],v=sub(end,start),L=Math.hypot(...v),u=v.map(k=>k/L),n=[-u[1],u[0]],
        original=[start,end],transformed=original.map(pose),anchor=sub(transformed[0],start),dm=sub(transformed[1],transformed[0]);
  let coveredMm=0,intervalMm=null;
  if(c.missingEdge!==id){
   const p0=dot(anchor,u),m=dot(dm,u),range=clip(p0,m,0,L,clip(dot(anchor,n),dot(dm,n),-c.bandMm,c.bandMm,[0,1]));
   if(range){intervalMm=range.map(t=>p0+t*m).sort((x,y)=>x-y);coveredMm=Math.min(L,intervalMm[1]-intervalMm[0]);}
  }
  return {id,nominalMm:L,coveredMm,uncoveredMm:L-coveredMm,intervalMm,targetMm:original,draftMm:c.missingEdge===id?null:transformed};
 });
 const totalMm=spans.reduce((n,q)=>n+q.nominalMm,0),coveredMm=spans.reduce((n,q)=>n+q.coveredMm,0);
 return {schema,deviceId:'08-08',kind:'simulated-layout',sampleId:c.sampleId,inputRevision,revision:inputRevision+1,configuration:{...c},coordinateFrame:'Package-local XY centered on draft, positive yaw counter-clockwise',units:{geometry:'mm',percent:'%',yawDeg:'deg'},spans,totalMm,coveredMm,uncoveredMm:totalMm-coveredMm,percent:100*coveredMm/totalMm,complete:Math.abs(coveredMm-totalMm)<1e-10,
  state:'layout-inspected-not-welded',leakTest:{status:'not-run',measuredRate:null},
  provenance:{method:'Passive line clipping and per-edge projection into tolerance corridor. No toolpath or process output.',physicalMeasurement:false,history:[{deviceId:'08-08',operation:'layout inspection only',parentRevision:inputRevision,resultRevision:inputRevision+1}]}};
}
export function act(s,id,v){
 const idle={...s,result:null,error:''};
 if(id==='reset')return initial();
 if(id==='door')return {...s,door:!s.door,error:''};
 if(id==='seat'){if(!s.door)return {...s,error:'Open the inspection cabinet first.'};return {...idle,fixture:!s.fixture};}
 if(id==='presetEdge')return act(s,'set',{missingEdge:s.config.missingEdge==='none'?'east':'none'});
 if(id==='set')return {...idle,config:{...s.config,...v},revision:v.sampleId!==undefined&&v.sampleId!==s.config.sampleId?0:s.revision};
 if(id==='run'){try{req(s.fixture,'Seat the virtual package first.');const result=solve(s.config,s.revision);return {...s,result,error:'',revision:result.revision};}catch(e){return {...idle,error:e.message};}}
 throw Error('Unknown inspection action');
}
export function csv(r){const q=x=>'"'+String(x).replace(/"/g,'""')+'"';return ['sampleId,revision,edge,nominal_mm,covered_mm,uncovered_mm,leak_test',...r.spans.map(x=>[q(r.sampleId),r.revision,x.id,x.nominalMm,x.coveredMm,x.uncoveredMm,r.leakTest.status].join(','))].join('\n')+'\n';}
