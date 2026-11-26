// Deterministic pedagogical Bragg–Brentano forward model. No X-ray generator or real equipment control.
export const defaults=Object.freeze({sampleId:'SI-640F-DEMO',siteId:'POWDER-1',parentRevision:0,source:'silicon',wavelengthA:1.7903,dA:2,startDeg:25,endDeg:115,stepDeg:.02,instrumentFwhmDeg:.2,sampleFwhmDeg:0,backgroundAu:3});
export const siLatticeA=5.431144;
export const bounds=Object.freeze({wavelengthA:[.5,2.6],dA:[.255,30],startDeg:[10,149],endDeg:[11,150],stepDeg:[.005,.1],instrumentFwhmDeg:[.05,2],sampleFwhmDeg:[0,2],backgroundAu:[0,30]});
const name=x=>typeof x==='string'&&/^[A-Za-z0-9_. ()/+-]{1,80}$/.test(x);
const valid=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b,err=(code,message)=>({ok:false,code,message});
const ln2=Math.log(2);
export function bragg(dA,wavelengthA){const z=wavelengthA/(2*dA);return z>0&&z<=1?2*Math.asin(z)*180/Math.PI:null;}
const silicon=[[1,1,1,100],[2,2,0,66],[3,1,1,35],[4,0,0,14],[3,3,1,19],[4,2,2,12],[5,1,1,8],[4,4,0,6],[5,3,1,6]];
export const siliconLines=()=>silicon.map(([h,k,l,heightAu])=>({label:'Si ('+h+k+l+')',phase:'Si (reference)',dA:siLatticeA/Math.hypot(h,k,l),heightAu}));
export function importLines(value){
 if(typeof value!=='string'||value.length>20000)throw Error('Reflection list exceeds 20 kB.');
 const rows=value.trim().split(/\r?\n/).filter(q=>q.trim()&&!q.trimStart().startsWith('#'));
 const header=rows.shift()?.replace(/^\uFEFF/,'').trim();
 if(header!=='label,phase,d_A,height_au')throw Error('Expected CSV header: label,phase,d_A,height_au');
 if(!rows.length||rows.length>25)throw Error('Supply 1–25 reference rows.');
 return rows.map(row=>{
  const [label,phase,d,h,...rest]=row.split(',').map(s=>s.trim());const dA=Number(d),heightAu=Number(h);
  if(rest.length||!name(label)||!name(phase)||!valid(dA,...bounds.dA)||!valid(heightAu,.001,10000))throw Error('Invalid reflection row: label, phase, spacing in Å, positive relative height. Commas in names are not supported.');
  return {label,phase,dA,heightAu};
 });
}
function estimate(p,ctr,width,series,overlap){
 const {stepDeg:delta,backgroundAu:b}=p;
 if(overlap)return {status:'overlap: no isolated line fit'};
 if(ctr-2*width<series[0][0]||ctr+2*width>series.at(-1)[0])return {status:'peak near scan edge'};
 const a=Math.max(1,Math.ceil((ctr-2*width-p.startDeg)/delta)),z=Math.min(series.length-2,Math.floor((ctr+2*width-p.startDeg)/delta));
 let peak=a;
 for(let k=a+1;k<=z;k++)if(series[k][1]>series[peak][1])peak=k;
 const L=Math.log(series[peak-1][1]-b),M=Math.log(series[peak][1]-b),R=Math.log(series[peak+1][1]-b),den=L-2*M+R;
 if(!Number.isFinite(den)||!(den<0))return {status:'peak fit invalid'};
 const fraction=(L-R)/(2*den),center=series[peak][0]+delta*fraction,top=Math.exp(M-(L-R)**2/(8*den))*0.5,cut=top+b;
 let lo=peak;while(lo>a&&series[lo][1]>cut)lo--;
 let hi=peak;while(hi<z&&series[hi][1]>cut)hi++;
 if(series[lo][1]>cut||series[hi][1]>cut||lo===peak||hi===peak)return {status:'half-max crossings unavailable'};
 const cross=(i,j)=>series[i][0]+(cut-series[i][1])*(series[j][0]-series[i][0])/(series[j][1]-series[i][1]);
 let s=0,t=0;for(let i=a;i<=z;i++){const area=series[i][1]-b;s+=area;t+=area*series[i][0];}
 return {status:'isolated',centerDeg:center,fwhmDeg:cross(hi-1,hi)-cross(lo,lo+1),centroidDeg:t/s,fitWindowDeg:[series[a][0],series[z][0]]};
}
export function scan(input={},imported=null){
 const p={...defaults,...input};
 if(!name(p.sampleId)||!name(p.siteId)||!Number.isSafeInteger(p.parentRevision)||p.parentRevision<0||p.parentRevision>99999999)return err('identity','Enter valid sample and site IDs and parent revision.');
 for(const [k,range] of Object.entries(bounds))if(!(k==='dA'&&p.source!=='single')&&!valid(p[k],...range))return err('setting',k+' is outside the accepted virtual range.');
 if(!['single','silicon','import'].includes(p.source)||!(p.endDeg>p.startDeg))return err('setting','Choose a source and increasing angular range.');
 const width=Math.hypot(p.instrumentFwhmDeg,p.sampleFwhmDeg);
 if(width/p.stepDeg<6)return err('sampling','Use at least six angular grid intervals per combined FWHM. Reduce the angular step.');
 const N=Math.floor((p.endDeg-p.startDeg)/p.stepDeg+1e-9)+1;
 if(N>14001||N<8)return err('budget','Choose a span and step yielding 8–14,001 points.');
 const lines=p.source==='silicon'?siliconLines():p.source==='single'?[{label:'Ideal isolated line',phase:'Teaching reference',dA:p.dA,heightAu:100}]:imported?.lines;
 if(!Array.isArray(lines)||lines.length<1||lines.length>25||lines.some(z=>!name(z.label)||!name(z.phase)||!valid(z.dA,...bounds.dA)||!valid(z.heightAu,.001,10000)))return err('reflection','No supported reflection list. Import the reference CSV or select another specimen.');
 const orders=lines.map(v=>({...v,reference2ThetaDeg:bragg(v.dA,p.wavelengthA)})),allowed=orders.filter(x=>x.reference2ThetaDeg!==null);
 if(!allowed.length)return err('forbidden','There is no real first-order angle for the declared spacing and wavelength.');
 const live=allowed.filter(q=>q.reference2ThetaDeg>=p.startDeg&&q.reference2ThetaDeg<=p.endDeg);
 if(!live.length)return err('range','No reference reflections inside the scan. Adjust the virtual angular interval.');
 const rows=Array.from({length:N},(_,i)=>{
  const x=p.startDeg+i*p.stepDeg;
  let I=p.backgroundAu;
  for(const v of allowed){const q=(x-v.reference2ThetaDeg)/width;if(Math.abs(q)<10)I+=v.heightAu*Math.exp(-4*ln2*q*q);}
  return [x,I];
 });
 const peaks=orders.map(v=>{
  const a=v.reference2ThetaDeg,info={label:v.label,phaseLabel:v.phase,dSpacingA:v.dA,relativeHeightAu:v.heightAu,predicted2ThetaDeg:a};
  if(a===null)return {...info,status:'forbidden'};
  if(a< p.startDeg||a>rows.at(-1)[0])return {...info,status:'outside sampled interval'};
  return {...info,...estimate(p,a,width,rows,allowed.some(l=>l!==v&&Math.abs(l.reference2ThetaDeg-a)<4*width))};
 });
 return {ok:true,result:{
  schema:'bts.powder-diffraction.v1',deviceId:'05-12',sampleId:p.sampleId,siteId:p.siteId,parentRevision:p.parentRevision,revision:p.parentRevision+1,
  provenance:{origin:'simulated',reference:p.source==='silicon'?'NIST SRM 640f certified silicon lattice parameter at 22.5 °C':p.source==='single'?'ideal teaching reflection':imported.filename,measuredCounts:false,heights:'scaled teaching or user input; not structure-factor predictions',phaseLabels:'reference input labels, never a search match'},
  configuration:p,geometry:{scheme:'theta–2theta Bragg–Brentano',referenceRadiusMm:185,wavelengthA:p.wavelengthA,order:1},
  lineShape:{type:'Gaussian',combinedFwhmDeg:width,baselineAu:p.backgroundAu},endpointDeg:rows.at(-1)[0],columns:['two_theta_deg','intensity_au'],spectrum:rows,peaks
 }};
}
export function csv(r){
 return ['# origin=simulated','# sampleId='+r.sampleId,'# siteId='+r.siteId,'# parentRevision='+r.parentRevision,'# revision='+r.revision,'# wavelength_A='+r.geometry.wavelengthA,r.columns.join(','),...r.spectrum.map(v=>v.join(','))].join('\n')+'\n';
}
