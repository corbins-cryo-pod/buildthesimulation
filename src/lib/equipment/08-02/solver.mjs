// Inert ribbon routing geometry only. No bonding parameters, strength, electrical resistance or real hardware commands.
export const schema='bts.ribbon-clearance.v1';
export const defaults=()=>({sampleId:'package-fanout-01',spanUm:500,apexUm:120,thicknessUm:25,widthUm:127,blockXUm:250,blockLengthUm:100,blockOffsetUm:0,blockWidthUm:100,blockHeightUm:115,marginUm:15,orientationDeg:0});
export const initial=()=>({config:defaults(),seated:true,result:null,error:'',revision:0});
const need=(q,m)=>{if(!q)throw Error(m)},inR=(x,l,h)=>Number.isFinite(x)&&x>=l&&x<=h;
export function validate(c){
 need(c&&typeof c.sampleId==='string'&&c.sampleId.trim().length>0&&c.sampleId.length<=96,'Name an inert package.');
 need(inR(c.spanUm,250,2000)&&inR(c.apexUm,30,400)&&inR(c.thicknessUm,5,50)&&inR(c.widthUm,25,200),'Ribbon or loop is outside the virtual design range.');
 need(inR(c.blockXUm,0,c.spanUm)&&inR(c.blockLengthUm,10,400)&&inR(c.blockOffsetUm,-400,400)&&inR(c.blockWidthUm,10,400)&&inR(c.blockHeightUm,0,400),'Keep-out box is outside the fixture controls.');
 need(inR(c.marginUm,0,100)&&inR(c.orientationDeg,-180,180),'Check requested margin or wedge orientation.');
}
export function solve(c,inputRevision=0){
 validate(c);need(Number.isSafeInteger(inputRevision)&&inputRevision>=0,'Invalid revision.');
 const h=x=>{const u=x/c.spanUm;return Math.max(c.thicknessUm/2,4*c.apexUm*u*(1-u));};
 const lo=Math.max(0,c.blockXUm-c.blockLengthUm/2),hi=Math.min(c.spanUm,c.blockXUm+c.blockLengthUm/2),overlap=hi>=lo&&Math.abs(c.blockOffsetUm)<=(c.blockWidthUm+c.widthUm)/2;
 const gapUm=overlap?Math.min(h(lo),h(hi))-c.thicknessUm/2-c.blockHeightUm:null,intersects=overlap&&gapUm<=0,belowMargin=overlap&&gapUm<c.marginUm;
 const a=c.orientationDeg*Math.PI/180,footL=150,footW=c.widthUm,dx=Math.abs(footL*Math.cos(a))+Math.abs(footW*Math.sin(a)),dy=Math.abs(footL*Math.sin(a))+Math.abs(footW*Math.cos(a)),padFit=dx<=200&&dy<=180;
 const points=Array.from({length:101},(_,i)=>{const xUm=c.spanUm*i/100;return {xUm,yUm:0,centerZUm:h(xUm),lowerZUm:h(xUm)-c.thicknessUm/2,upperZUm:h(xUm)+c.thicknessUm/2};});
 return {schema,deviceId:'08-02',kind:'simulated',model:'Kulicke & Soffa 4523D, vertical-feed geometry study',sampleId:c.sampleId,inputRevision,revision:inputRevision+1,configuration:{...c},units:{position:'µm',gapUm:'µm',orientationDeg:'deg'},coordinateFrame:'Package-local; X from pad A to B, Y across substrate plane, Z up',
  pads:[{id:'PAD-A',centerUm:[0,0,0],footprintUm:[footL,footW],directionDeg:c.orientationDeg},{id:'PAD-B',centerUm:[c.spanUm,0,0],footprintUm:[footL,footW],directionDeg:c.orientationDeg}],points,gapUm,intersects,belowMargin,padFit,layoutPass:!intersects&&!belowMargin&&padFit,
  connectivity:{edge:['PAD-A','PAD-B'],idealEligible:!intersects&&padFit,measuredElectricalContinuity:false},provenance:{method:'parabolic centerline with endpoint floor at half thickness; rectangular sweep; exact end-of-overlap clearance',measuredHardware:false,history:[{deviceId:'08-02',operation:'virtual ribbon design check',parentRevision:inputRevision,resultRevision:inputRevision+1}]}};
}
export function act(s,id,p){
 const idle={...s,result:null,error:''};
 if(id==='reset')return initial();
 if(id==='seat')return {...idle,seated:!s.seated};
 if(id==='apex')return act(s,'set',{apexUm:s.config.apexUm===120?160:120});
 if(id==='set')return {...idle,config:{...s.config,...p},revision:p.sampleId!==undefined&&p.sampleId!==s.config.sampleId?0:s.revision};
 if(id==='run'){try{need(s.seated,'Seat the package before evaluating the ribbon.');const result=solve(s.config,s.revision);return {...s,result,error:'',revision:result.revision};}catch(e){return {...idle,error:e.message};}}
 throw Error('Unknown ribbon action');
}
export function csv(r){const q=x=>'"'+String(x).replace(/"/g,'""')+'"',k=Object.keys(r.points[0]);return ['sampleId,revision,padA,padB,kind,'+k.join(','),...r.points.map(p=>[q(r.sampleId),r.revision,'PAD-A','PAD-B',r.kind,...k.map(a=>p[a])].join(','))].join('\n')+'\n';}
