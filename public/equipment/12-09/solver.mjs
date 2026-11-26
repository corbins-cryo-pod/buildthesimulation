const n=64, spacingUm=.1, extentUm=n*spacingUm, tau=2*Math.PI;
export const tracks=Object.freeze(['wide','narrow','flat','missing']);
export const titles=Object.freeze({wide:'Wide blur',narrow:'Narrow blur',flat:'Constant control',missing:'Missing comparison'});
const offsets=Object.freeze({wide:.30,narrow:.10,flat:null});
const results=new Map();
function inspectSamples(a){
 let mean=a.reduce((p,q)=>p+q,0)/a.length;
 if(Math.max(...a)-Math.min(...a)<1e-12)return {status:'no-pattern',mean,frequency:null};
 const sums=new Float64Array(2*n*n);
 for(let y=0;y<n;y++)for(let k=0;k<n;k++)for(let x=0;x<n;x++){
  const t=tau*k*x/n,i=2*(y*n+k),v=a[y*n+x]-mean;
  sums[i]+=v*Math.cos(t);sums[i+1]-=v*Math.sin(t);
 }
 let peak={abs:0,kx:0,ky:0};
 for(let kx=0;kx<n/2;kx++)for(let ky=-n/2;ky<n/2;ky++){
  if(kx===0&&ky<=0)continue;
  let re=0,im=0;
  for(let y=0;y<n;y++){const i=2*(y*n+kx),t=tau*ky*y/n,c=Math.cos(t),s=Math.sin(t);re+=sums[i]*c+sums[i+1]*s;im+=sums[i+1]*c-sums[i]*s;}
  const abs=Math.hypot(re,im);if(abs>peak.abs)peak={abs,kx,ky};
 }
 const c=Math.hypot(peak.kx,peak.ky)/extentUm;
 return {status:'pattern-found',mean,frequency:{binXY:[peak.kx,peak.ky],cyclesPerUm:c,pitchUm:1/c,
  vectorDeg:((Math.atan2(peak.ky,peak.kx)*180/Math.PI)+180)%180,contrast:(2*peak.abs/(n*n))/mean}};
}
export function imageTrack(track){
 if(!tracks.includes(track))throw new RangeError('Unknown fixed comparison track.');
 if(track==='missing')return {id:track,available:false,blurSigmaUm:null,values:null,analysis:{status:'missing-input',mean:null,frequency:null}};
 if(!results.has(track)){
  const sigma=offsets[track];
  const contrast=track==='flat'?0:.7*Math.exp(-tau*tau/2*sigma*sigma*(25+9)/(extentUm*extentUm));
  const values=Array.from({length:n*n},(_,i)=>.5+.5*contrast*Math.cos(tau*(5*(i%n)+3*Math.floor(i/n))/n));
  results.set(track,Object.freeze({id:track,available:true,blurSigmaUm:sigma,values:Object.freeze(values),analysis:inspectSamples(values)}));
 }
 return results.get(track);
}
export const blank=()=>({track:'wide',revision:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='set-track'){
  const track=a.type==='cycle'?tracks[(tracks.indexOf(s.track)+1)%tracks.length]:a.payload;
  if(!tracks.includes(track))throw new RangeError('Unknown fixed comparison track.');
  return {...s,track,report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive image inspection is available.');
 const entry=imageTrack(s.track),revision=s.revision+1;
 return {...s,revision,report:{schema:'bts.staged-grating.report.v1',parentRevision:s.revision||null,revision,
  sampleId:'STAGED-GRATING-5-3',provenance:'Synthetic inert single-frequency grating rendered analytically; not a real acquisition or a SIM reconstruction.',
  selectedTrack:entry.id,available:entry.available,analysis:entry.analysis,
  comparison:tracks.map(k=>({track:k,status:imageTrack(k).analysis.status,contrast:imageTrack(k).analysis.frequency?.contrast??null})),
  grid:{shape:[n,n],spacingUm:[spacingUm,spacingUm],extentUm:[extentUm,extentUm],axes:['+X right','+Y up'],intensityUnit:'relative',order:'x fastest. First row starts at low y.'},
  selectedValues:entry.values}};
}
