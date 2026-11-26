// Pure virtual Cartesian transform for a rounded-spec 25 mm span; no device communication.
export const travelMm=Object.freeze([-12.5,12.5]), datumMm=Object.freeze([4,-2,1]);
export const defaults=()=>({xMm:3,yMm:0,zMm:0,yawDeg:90});
export const initial=()=>({configuration:defaults(),result:null,error:'',revision:0});
const valid=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b, round=x=>Math.abs(x)<1e-12?0:Number(x.toFixed(12));
export function solve(c,revision=0){
 if(![c.xMm,c.yMm,c.zMm].every(v=>valid(v,-100,100))||!valid(c.yawDeg,-180,180))throw Error('Enter requests −100 to +100 mm and virtual yaw within ±180°.');
 const requestedStageMm=[c.xMm,c.yMm,c.zMm],appliedStageMm=requestedStageMm.map(q=>Math.max(travelMm[0],Math.min(travelMm[1],q)));
 const blockedAxes=['X','Y','Z'].filter((_,i)=>appliedStageMm[i]!==requestedStageMm[i]);
 const [X,Y,Z]=appliedStageMm,t=c.yawDeg*Math.PI/180,co=Math.cos(t),si=Math.sin(t);
 const displacementSampleMm=[X*co-Y*si,X*si+Y*co,Z].map(round);
 const tipSampleMm=datumMm.map((value,i)=>round(value+displacementSampleMm[i]));
 return {schema:'bts.inert-cartesian-pose.v1',deviceId:'10-07',kind:'simulated geometry',sampleId:'inert-cube-01',revision:revision+1,parentRevision:revision,
   local:{axes:['X','Y','Z'],requestedStageMm,appliedStageMm,actuatorTravelMm:travelMm,blockedAxes},sample:{yawAboutPlusZDeg:c.yawDeg,datumMm,displacementSampleMm,tipSampleMm,tipSampleM:tipSampleMm.map(v=>v/1000),frame:'right-handed; Z up'},
   provenance:'Sutter rounded 25 mm full mechanical travel used for centered home. Rigid synthetic coordinate reference, not a measured or controlled instrument; collision not modeled.'};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='set')return {...s,configuration:{...s.configuration,...p},result:null,error:''};
 if(id==='limit')return act(act(s,'set',{xMm:40,yMm:0,zMm:0,yawDeg:90}),'move');
 if(id==='nudge'){const k=p?.toLowerCase()+'Mm';if(!['xMm','yMm','zMm'].includes(k))throw Error('Unknown virtual axis');return act(act(s,'set',{[k]:Math.min(100,s.configuration[k]+1)}),'move');}
 if(id==='move'){try{const result=solve(s.configuration,s.revision);return {...s,result,revision:result.revision,error:''};}catch(e){return {...s,result:null,error:e.message}}}
 throw Error('Unknown inert coordinate action');
}
