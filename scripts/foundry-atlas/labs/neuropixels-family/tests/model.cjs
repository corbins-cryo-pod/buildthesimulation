'use strict';
const assert=require('node:assert/strict'), E=require('../src/engine.js');let checks=0;
const check=(v,m)=>{assert.ok(v,m);checks++;};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const ans=(k,p,o={})=>E.evaluate(k,p,o),run=(a,kind,num=0,shank=0)=>E.tags(a,{kind,num,shank});
eq(Object.keys(E.profiles).length,9);eq(Object.values(E.preset).reduce((n,p)=>n+p.length,0),31);
for(const expression of ['-2','2-0','966','5-960','2.2','1e2','0,0','0,','0-2,2','<script>','0-99999999999999999','','   ','2--4'])check(!!E.parseSites(expression).error,expression);
eq(E.parseSites('0,2-4 8').ids,[0,2,3,4,8]);eq(E.parseSites('0-959').ids.length,960);
// Independent collision oracle for all 460,320 unordered distinct pairs (0..959).
let pairCount=0,aliases=0;
for(let a=0;a<960;a++){for(let b=a+1;b<960;b++){
 const expectedAlias=b-a===384||b-a===768,res=ans('np1','manual',{sites:a+','+b});
 if(expectedAlias)aliases++;
 check((res.code==='invalid')===expectedAlias,a+'/'+b);
 if(!expectedAlias){check(res.groups[0].lane!==res.groups[1].lane);check(res.groups.every(x=>x.hardwareLane));}
 pairCount++;
}}
eq(pairCount,460320);eq(aliases,768);
let b0=ans('np1','b0'),b1=ans('np1','b1'),b2=ans('np1','b2');
eq([b0.groups.length,b1.groups.length,b2.groups.length],[384,384,192]);eq(b2.groups.at(-1).lane,191);
eq(run(b0,'site',0).missing,1);eq(run(b1,'site',0).missing,0);eq(run(b0,'lane',0).missing,1);eq(run(b1,'lane',0).missing,1);
eq(run(b0,'site',960).rows.length,0);eq(run(b0,'lane',384).rows.length,0);eq(ans('np1','manual',{sites:'0-959'}).code,'invalid');
let certified=0;for(let s=0;s<=896;s++){const r=ans('np2s','window',{start:s});eq(r.groups.length,384);eq(r.groups[0].site,s);eq(r.groups.at(-1).site,s+383);eq(r.code,s%32===0?'pattern':'bounds');if(r.code==='pattern')certified++;}eq(certified,29);
for(const s of [897,-1,1.4,NaN,Infinity])eq(ans('np2s','window',{start:s}).code,'invalid');
for(const mode of ['flat','diag']){let r=ans('np2m',mode);eq(r.counts,[96,96,96,96]);for(let i=0;i<4;i++){const g=r.groups.filter(x=>x.sh===i);eq(g[0].site,mode==='diag'?96*i:0);eq(g.at(-1).site,g[0].site+95);eq(run(r,'shank',0,i).missing,96);}}
for(let i=0;i<4;i++){let r=ans('np2m','one',{shank:i});eq(r.counts[i],384);eq(run(r,'shank',0,i).missing,384);eq(run(r,'shank',0,(i+1)%4).missing,0);}
for(const col of [8,4,2,1]){let r=ans('ultra','u'+col);eq(r.rows*col,384);eq(r.centerSpan+5,r.edgeSpan);eq(r.centerSpan,({8:282,4:570,2:1146,1:2298})[col]);check(r.groups.every(x=>x.site===null&&!x.hardwareLane));check(!!run(r,'site',0).error);}
eq(ans('nxt','dense').code,'bounds');eq(ans('quad','counts',{counts:[385,383,384,384]}).code,'invalid');eq(ans('nxt','counts',{counts:[385,383,384,384]}).code,'bounds');
for(const k of ['quad','nxt','np2m']){
 const {total,per}=E.profiles[k],vs=[0,1,96,208,384,385,768,912,913,1536];let cases=0;
 for(const a of vs)for(const b of vs)for(const c of vs)for(const d of vs){const counts=[a,b,c,d],r=ans(k,'counts',{counts});const expected=a+b+c+d>0&&a+b+c+d<=total&&Math.max(a,b,c,d)<=per;eq(r.code!=='invalid',expected);if(expected){eq(r.groups.length,a+b+c+d);eq(r.code,'bounds');}cases++;}
 eq(cases,10000);
 for(const counts of [[-1,0,0,1],[NaN,1,1,1],[0.5,2,1,1],[5],[1,1,1,10000000000]])eq(ans(k,'counts',{counts}).code,'invalid');
}
for(const nm of [450,638])for(let pos=0;pos<14;pos++){const r=ans('opto','color',{wavelength:nm,emitter:pos});eq(r.counts,[384]);eq(r.wavelength,nm);eq(r.emitter,pos);}
for(const opt of [{wavelength:470},{emitter:14},{emitter:-1}])eq(ans('opto','color',opt).code,'invalid');
for(const k of Object.keys(E.profiles)){
 const m=E.profiles[k];
 for(const [p] of E.preset[k]){
  const o=p==='counts'?{counts:Array(m.n).fill(m.total/m.n)}:p==='manual'?{sites:'0-31,512'}:{};
  const ev=ans(k,p,o);
  if(ev.code==='invalid'){check(!!E.tags(ev).error);continue;}
  eq(ev.groups.length,ev.requested);eq(new Set(ev.groups.map(x=>x.lane)).size,ev.requested);
  for(const [kind,missing,wrong] of [['none',0,0],['common',ev.requested,0],['swap',0,2],['shank',ev.counts[0],0]]){
   const t=run(ev,kind);eq(t.missing,missing);eq(t.wrong,wrong);eq(t.correct+t.wrong,t.received);eq(t.correct+t.wrong+t.missing,ev.requested);eq(new Set(t.rows.map(x=>x.expected)).size,ev.requested);check(t.rows.every(x=>Number.isInteger(x.expected)&&x.expected>=0&&x.expected<2**18));
  }
 }
}
console.log(JSON.stringify({assertions:checks,allDistinctNp1SitePairs:pairCount,np1CollidingPairs:aliases,np2StartsTested:897,paperAlignedNp2Starts:certified,fourShankAllocationVectors:30000,optoColorEmitterPairs:28}));
