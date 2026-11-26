// Coherent isotropic reflection with passive n+i k and e^(−iωt). No vendor firmware, optical library or ray API.
export const AOI=Object.freeze([65,70,75,90]);
const D=Math.PI/180,E=1e-12;
const range=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
const req=(x,m)=>{if(!x)throw Error(m)};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],div=(a,b)=>{const d=b[0]*b[0]+b[1]*b[1];return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d]};
const sqr=a=>mul(a,a),abs=a=>Math.hypot(...a),one=[1,0];
const root=a=>{const r=abs(a);return [Math.sqrt(Math.max(0,(r+a[0])/2)),Math.sign(a[1]||1)*Math.sqrt(Math.max(0,(r-a[0])/2))]};
export const wrap=x=>((x%360)+360)%360,deltaDifference=(a,b)=>wrap(a-b+180)-180;
const cleanId=s=>typeof s==='string'&&/^[a-zA-Z0-9_.-]{1,80}$/.test(s);
export const defaultFilm=()=>[{name:'teaching dielectric',n:1.46,k:0,thicknessNm:123.4}];
export const defaultSubstrate=()=>({name:'high-index teaching substrate',n:3.85,k:.03});
export function verifyModel(stack,sub){
 req(Array.isArray(stack)&&stack.length<=4,'0–4 finite layers supported.');
 for(const [i,a] of [...stack,sub].entries()){
  req(a&&typeof a.name==='string'&&a.name.length<=100,'Name every optical layer.');
  if(a.table){
   req(Array.isArray(a.table)&&a.table.length>=2&&a.table.length<=800&&a.table[0][0]<=380&&a.table.at(-1)[0]>=900,'A dispersion table must cover 380–900 nm.');
   for(const [k,v] of a.table.entries())req(Array.isArray(v)&&v.length===3&&range(v[0],200,2000)&&range(v[1],1,8)&&range(v[2],0,4)&&(k===0||v[0]>a.table[k-1][0]),'Each table row is ascending [nm, n, k] with passive k ≥ 0.');
  }else req(range(a.n,1,8)&&range(a.k,0,4),'Use passive index 1 ≤ n ≤ 8 and 0 ≤ k ≤ 4.');
  if(i<stack.length)req(range(a.thicknessNm,0,2000),'Finite layer thickness must be 0–2000 nm.');
 }
}
function nk(o,w){
 if(!o.table)return [o.n,o.k];
 const i=o.table.findIndex(v=>v[0]>=w);req(i>=0&&w>=o.table[0][0],'No wavelength extrapolation.');
 if(i===0)return o.table[0].slice(1);const a=o.table[i-1],b=o.table[i],t=(w-a[0])/(b[0]-a[0]);return [a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])];
}
export function row(w,angle,stack,substrate){
 const sx=Math.sin(angle*D),sx2=sx*sx,all=[one,...stack.map(v=>nk(v,w)),nk(substrate,w)],ns=all.map(sqr),q=ns.map(v=>root([v[0]-sx2,v[1]]));
 const reflect=pol=>{
  function r(i,j){
   if(pol==='s')return div(sub(q[i],q[j]),add(q[i],q[j]));
   const H=mul(ns[j],q[i]),G=mul(ns[i],q[j]);return div(sub(H,G),add(H,G));
  }
  let R=r(q.length-2,q.length-1);
  for(let k=stack.length;k>=1;k--){const x=4*Math.PI*stack[k-1].thicknessNm/w,decay=Math.exp(-x*q[k][1]),phase=x*q[k][0],z=mul(R,[decay*Math.cos(phase),decay*Math.sin(phase)]),b=r(k-1,k);R=div(add(b,z),add(one,mul(b,z)))}
  return R;
 };
 const rs=reflect('s'),rp=reflect('p'),a=abs(rp),b=abs(rs),psiDeg=Math.atan2(a,b)/D;
 const deltaDeg=a<E||b<E?null:wrap((Math.atan2(rp[1],rp[0])-Math.atan2(rs[1],rs[0]))/D);
 return {wavelengthNm:w,angleDeg:angle,psiDeg,deltaDeg,rs,rp};
}
export function spectrum(wavelengths,angles,stack,sub){
 verifyModel(stack,sub);req(Array.isArray(wavelengths)&&wavelengths.length>=1&&wavelengths.length<=180&&wavelengths.every((w,i)=>range(w,380,900)&&(i===0||w>wavelengths[i-1])),'Use 1–180 ascending wavelengths in 380–900 nm.');
 req(Array.isArray(angles)&&angles.length>=1&&angles.length<=3&&angles.every(x=>AOI.slice(0,3).includes(x))&&new Set(angles).size===angles.length,'Reflection requires indexed 65°, 70° or 75°.');
 return angles.flatMap(a=>wavelengths.map(w=>row(w,a,stack,sub)));
}
export function validate(d){
 req(d?.schema==='bts.ellipsometry-spectrum.v1'&&cleanId(d.sampleId)&&Number.isSafeInteger(d.revision)&&d.revision>=0&&d.revision<1e9,'Expected bts.ellipsometry-spectrum.v1, sample ID and revision.');
 verifyModel(d.stack,d.substrate);req(d.stack.length>=1,'At least one finite film is required for a thickness fit.');
 req(Array.isArray(d.rows)&&range(d.rows.length,1,540),'Provide 1–540 optical observations.');
 const seen=new Set();for(const r of d.rows){
  const k=r.angleDeg+'|'+r.wavelengthNm;
  req(range(r.wavelengthNm,380,900)&&[65,70,75].includes(r.angleDeg)&&range(r.psiDeg,0,90)&&(r.deltaDeg===null||range(r.deltaDeg,0,360))&&!seen.has(k),'Use unique angle/wavelength rows, Ψ in [0,90] and Δ in [0,360] degrees.');seen.add(k);
 }return d;
}
// Finite grid then golden-section refinement of all resolved local minima. The reported 'within noise'
// band describes practical indistinguishability only, not a confidence interval or vendor MSE.
export function fit(d,{minNm=0,maxNm=1000,resolutionNm=.5,agreementDeg=.1,angleDeg=null,wavelengthNm=null}={}){
 validate(d);req(range(minNm,0,1999)&&range(maxNm,minNm+.25,2000)&&range(resolutionNm,.25,10)&&range(agreementDeg,1e-5,5),'Check thickness interval, search resolution and agreement threshold.');
 let obs=d.rows.filter(r=>(angleDeg===null||r.angleDeg===angleDeg)&&(wavelengthNm===null||r.wavelengthNm===wavelengthNm));
 req(obs.length,'No supplied observations match that angle or wavelength.');
 const calc=(t,details=false)=>{
  const stack=[{...d.stack[0],thicknessNm:t},...d.stack.slice(1)];
  let ss=0,N=0;const residuals=[];
  for(const r of obs){
   const p=row(r.wavelengthNm,r.angleDeg,stack,d.substrate),dp=p.psiDeg-r.psiDeg,dd=r.deltaDeg===null||r.psiDeg<E||r.psiDeg>90-E?null:p.deltaDeg===null?180:deltaDifference(p.deltaDeg,r.deltaDeg);
   ss+=dp*dp;N+=1;if(dd!==null){ss+=dd*dd;N++}if(details)residuals.push({...r,predPsiDeg:p.psiDeg,predDeltaDeg:p.deltaDeg,psiResidualDeg:dp,deltaResidualDeg:dd});
  }return {rmsDeg:Math.sqrt(ss/N),residuals};
 };
 const n=Math.ceil((maxNm-minNm)/resolutionNm),step=(maxNm-minNm)/n,profile=Array.from({length:n+1},(_,i)=>{const thicknessNm=minNm+i*step;return {thicknessNm,rmsDeg:calc(thicknessNm).rmsDeg}});
 const global=profile.reduce((a,b)=>b.rmsDeg<a.rmsDeg?b:a),flat=profile.reduce((m,p)=>Math.max(m,p.rmsDeg),0)-global.rmsDeg<=agreementDeg;
 const candidates=[];
 if(!flat){
  for(let i=0;i<=n;i++){
   const x=profile[i].rmsDeg,L=profile[i-1]?.rmsDeg??Infinity,R=profile[i+1]?.rmsDeg??Infinity;
   if(x>L||x>R||x===L&&x===R)continue;
   let a=profile[Math.max(0,i-1)].thicknessNm,b=profile[Math.min(n,i+1)].thicknessNm;
   for(let j=0;j<24;j++){const c=a+(b-a)*.381966,d=b-(b-a)*.381966;if(calc(c).rmsDeg<calc(d).rmsDeg)b=d;else a=c;}
   const k=(a+b)/2,z=calc(k).rmsDeg;candidates.push(z<x?{thicknessNm:k,rmsDeg:z}:profile[i]);
  }
 }
 candidates.sort((a,b)=>a.rmsDeg-b.rmsDeg||a.thicknessNm-b.thicknessNm);
 const best=candidates[0]??global,matching=candidates.filter(x=>x.rmsDeg<=best.rmsDeg+agreementDeg);
 const diagnostics={status:flat?'flat':matching.length>1?'multiple-orders':best.thicknessNm===minNm||best.thicknessNm===maxNm?'edge-limited':'unique-in-search',agreementDeg,resolutionNm:step,candidates:matching.slice(0,12),candidateCount:matching.length,rangeNm:[minNm,maxNm],note:'Model-conditional. Agreement threshold identifies comparable minima; not statistical coverage. Index/thickness trade-off is not fit.'};
 return {schema:'bts.ellipsometry-fit.v1',deviceId:'05-04',sampleId:d.sampleId,parentRevision:d.revision,revision:d.revision+1,thicknessNm:best.thicknessNm,rmsDeg:best.rmsDeg,assumedStack:[{...d.stack[0],thicknessNm:best.thicknessNm},...d.stack.slice(1)],substrate:d.substrate,rowCount:obs.length,residuals:calc(best.thicknessNm,true).residuals,diagnostics,profile:profile.filter((_,i)=>i%Math.max(1,Math.ceil(n/450))===0||i===n),provenance:{kind:'model-derived',spectrum:d.provenance??null,origin:'coherent recursive Fresnel / ideal fixed optical constants'}};
}
export function state(){return {power:true,loaded:true,vacuum:true,source:70,detector:70,data:null,result:null}}
export function action(s,key,arg){
 s.result=null;
 if(key==='power'){s.power=!s.power;return}
 if(key==='load'){req(!s.vacuum,'Release chuck vacuum before exchanging specimens.');s.loaded=!s.loaded;return}
 if(key==='vacuum'){req(s.loaded,'Place specimen on chuck first.');s.vacuum=!s.vacuum;return}
 if(key==='source'||key==='detector'){req(AOI.includes(arg),'Angle index not available.');s[key]=arg;return}
 if(key==='data'){s.data=null;s.data=validate(arg);return}
 if(key==='acquire'){
  req(s.power&&s.loaded&&s.vacuum,'Power the station and hold the specimen with the teaching chuck vacuum.');
  req(s.source===s.detector,'Both incidence-angle indexes must match.');
  req(s.source!==90,'90° straight-through is shown for inspection; transmission is not solved.');
  const {wave,stack,substrate,id='SIM-FILM',revision=0}=arg;
  const rows=spectrum(wave,[s.source],stack,substrate);
  s.data={schema:'bts.ellipsometry-spectrum.v1',sampleId:id,revision,stack,substrate,rows,provenance:{kind:'simulated',mode:'ideal reflection',angleDeg:s.source}};return s.data;
 }
 if(key==='fit'){req(s.data,'Load or acquire a spectrum first.');s.result=fit(s.data,arg);return s.result}
 throw Error('Unknown ellipsometer action.');
}
export function csv(r){req(r,'No fitted result to export.');const fields=['wavelengthNm','angleDeg','psiDeg','deltaDeg','predPsiDeg','predDeltaDeg','psiResidualDeg','deltaResidualDeg'];return ['# sampleId: '+r.sampleId,'# revision: '+r.revision,fields.join(','),...r.residuals.map(x=>fields.map(k=>x[k]??'').join(','))].join('\n')+'\n';}
