import fs from 'node:fs';import {fileURLToPath} from 'node:url';
import {row,fit,state,action,deltaDifference,defaultFilm,defaultSubstrate,csv} from '../../../public/equipment/05-04/solver.mjs';
const dir=new URL('../../../public/equipment/05-04/',import.meta.url),url=n=>new URL(n,dir),read=n=>fs.readFileSync(url(n)),write=(n,v)=>fs.writeFileSync(url(n),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
export function verify(){
 const d=JSON.parse(read('independent-spectrum.json')),decl=JSON.parse(read('reference-cases.json')),cases=[];
 const add=(id,expected,actual,units,tolerance,pass)=>cases.push({id,expected,actual,units,tolerance,outcome:pass?'PASS':'FAIL'});
 const num=(id,e,a,u,t)=>add(id,e,a,u,t,Number.isFinite(a)&&Math.abs(e-a)<=t);
 const n=row(600,0,[],{n:1.5,k:0});num('bare Fresnel s',-.2,n.rs[0],'amplitude',1e-10);num('bare Fresnel p',.2,n.rp[0],'amplitude',1e-10);num('bare Ψ',45,n.psiDeg,'degrees',1e-10);num('bare Δ',180,n.deltaDeg,'degrees',1e-10);
 const r=fit(d),t=d.provenance.knownThicknessNm;num('reference thickness',t,r.thicknessNm,'nm',.02);num('reference RMS',0,r.rmsDeg,'degrees',1e-5);num('observation count',81,r.rowCount,'positions',0);
 const a=fit(d,{angleDeg:70,wavelengthNm:600}),cand=a.diagnostics.candidates.map(v=>v.thicknessNm).sort((a,b)=>a-b),period=decl.cases.find(c=>c.id==='order-alias').expected;
 num('single datum optical order',period,cand[1]-cand[0],'nm',.02);add('single datum ambiguity','multiple-orders',a.diagnostics.status,'status','exact',a.diagnostics.status==='multiple-orders');
 const invisible={...d,stack:[{...d.substrate,thicknessNm:0}]},q=fit(invisible,{maxNm:300});add('matched light path','flat',q.diagnostics.status,'status','exact',q.diagnostics.status==='flat');
 num('phase wrapping +1 from 359',2,deltaDifference(1,359),'degrees',1e-10);
 const s=state();action(s,'data',d);action(s,'fit',{maxNm:500});action(s,'source',65);
 try{action(s,'acquire',{wave:[600],stack:defaultFilm(),substrate:defaultSubstrate()});add('angle mismatch','reject','acquired','','exact',false)}catch(e){add('angle mismatch','reject',e.message,'','exact',s.result===null&&e.message.includes('match'))}
 const b=read('alpha-se.glb'),N=b.readUInt32LE(12),G=JSON.parse(b.subarray(20,20+N)),lo=[Infinity,Infinity,Infinity],hi=lo.map(()=>-Infinity);
 for(const n of G.nodes){if(n.mesh===undefined)continue;for(const p of G.meshes[n.mesh].primitives){const a=G.accessors[p.attributes.POSITION];for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],a.min[j]+n.translation[j]);hi[j]=Math.max(hi[j],a.max[j]+n.translation[j])}}}
 const actual=hi.map((x,i)=>1000*(x-lo[i])),expected=[480,300,310];
 add('nominal envelope',expected,actual,'mm W/H/D',.75,actual.every((x,i)=>Math.abs(x-expected[i])<.75));
 const m=JSON.parse(read('xr-manifest.json')),found=Object.keys(m.interactions).every(k=>G.nodes.some(n=>n.name===k));add('VR named controls',true,found,'metric glTF and stable actions','exact',found&&b.length===m.geometry.bytes);
 return {proof:{deviceId:'05-04',scope:'Synthetic independent characteristic matrix and nominal model geometry, no physical or headset validation.',cases},r,a};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const x=verify();write('verification.json',x.proof);write('fit-example.json',x.r);write('residuals-example.csv',csv(x.r));console.table(x.proof.cases.map(({id,outcome,actual})=>({id,outcome,actual:JSON.stringify(actual)})));if(x.proof.cases.some(c=>c.outcome!=='PASS'))process.exitCode=1}
