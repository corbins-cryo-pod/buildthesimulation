/* SPDX-License-Identifier: MIT; teaching model. No device masks, pins, or calibrated tissue model. */
(function(g){
'use strict';
const nets=[...Array.from({length:7},(_,i)=>'L'+(i+1)),'GL',...Array.from({length:7},(_,i)=>'R'+(i+1)),'GR'];
const active=nets.filter(n=>!n.startsWith('G')),side=n=>n.endsWith('L')||n.startsWith('L')?'L':'R';
const num=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(+v)?+v:min));
const constants=Object.freeze({openingUm:80,pitchMm:0.75,staggerMm:0.375,groundApertures:109,nominalMetalRadiusUm:48,arealResistanceOhmMm2:25,arealCapacitanceFmm2:0.3e-6,seriesOhm:150});
const defaults=()=>({fault:'none',target:'L4',windowLeg:'GL',blocked:0,overlay:0,thickness:12,radius:1.2,returnMode:'local',hz:1000});
const sampleStage=[ 'Draw net families','Receive silicon carrier','Lay down base polyimide','Pattern Pt routing','Cover and register insulation','Open contact windows','Finish active interfaces','Peel the thin film','Fold on inert jig','Receive and join ceramic','Terminate 16-wire cable','Protect exit and inspect','Run conductor and load tests' ];
function normalize(a){const d=defaults(),x=a||{};return {fault:['none','open','bridge','swap'].includes(x.fault)?x.fault:d.fault,target:nets.includes(x.target)?x.target:d.target,windowLeg:['GL','GR'].includes(x.windowLeg)?x.windowLeg:d.windowLeg,blocked:Math.round(num(x.blocked??d.blocked,0,109)),overlay:num(x.overlay??d.overlay,0,100),thickness:num(x.thickness??d.thickness,4,40),radius:num(x.radius??d.radius,0.15,5),returnMode:['local','GL','GR'].includes(x.returnMode)?x.returnMode:d.returnMode,hz:num(x.hz??d.hz,10,100000)}}
function adjacent(n){if(n==='GL')return'GR';if(n==='GR')return'GL';const k=+n[1];return n[0]+(k===7?1:k+1)}
function hexSpots(){
 const points=[];
 for(let q=-9;q<=9;q++)for(let r=-9;r<=9;r++){const x=q+r/2,y=r*Math.sqrt(3)/2;points.push({q,r,x,y,d:q*q+q*r+r*r})}
 const list=points.sort((a,b)=>a.d-b.d||(a.r-b.r)||(a.q-b.q)).slice(0,109);return list.map((p,i)=>({id:i+1,x:p.x,y:p.y}));
}
const apertures=hexSpots();
function circleOverlap(r,R,d){if(d>=r+R)return 0;if(d<=Math.abs(R-r))return Math.PI*Math.min(r,R)**2;
 const c=x=>Math.max(-1,Math.min(1,x));return r*r*Math.acos(c((d*d+r*r-R*R)/(2*d*r)))+R*R*Math.acos(c((d*d+R*R-r*r)/(2*d*R)))-0.5*Math.sqrt(Math.max(0,(-d+r+R)*(d+r-R)*(d-r+R)*(d+r+R)))}
function zContact(area,hz){if(area<=0)return null;let G=area/constants.arealResistanceOhmMm2,B=2*Math.PI*hz*constants.arealCapacitanceFmm2*area,k=G*G+B*B;return {re:G/k,im:-B/k}}
function solve(data){
 const config=normalize(data),x=config;
 const N=nets.length,par=Array.from({length:N*3},(_,i)=>i),find=i=>par[i]===i?i:(par[i]=find(par[i])),join=(a,b)=>{par[find(a)]=find(b)};
 const t=nets.indexOf(x.target),peer=nets.indexOf(adjacent(x.target));
 // pin -> ceramic -> physical net; indices are fixture-only labels.
 for(let i=0;i<N;i++){
   let middle=(x.fault==='swap'&&i===t)?peer:(x.fault==='swap'&&i===peer?t:i);
   join(i,N+middle); if(!(x.fault==='open'&&i===t))join(N+i,2*N+i);
 }
 if(x.fault==='bridge')join(2*N+t,2*N+peer);
 const matrix=nets.map((_,i)=>nets.map((_,j)=>find(i)===find(2*N+j)));
 const matches=matrix.map((row,i)=>row[i]&&row.reduce((a,b)=>a+b,0)===1&&matrix.filter(r=>r[i]).length===1);
 const oneArea=circleOverlap(40,constants.nominalMetalRadiusUm,x.overlay)*1e-6;
 const sites=nets.map((net,i)=>{let nominal=net.startsWith('G')?109:1,openCount=nominal-(net===x.windowLeg?x.blocked:0);return {net,side:side(net),role:net[0]==='G'?'external return leg':'active shaft',nominalWindows:nominal,unobstructed:openCount,exposedAreaMm2:oneArea*openCount,exposedWindows:oneArea>0?openCount:0,alignedNet:matches[i],fixtureToPhysical:nets.filter((_,j)=>matrix[i][j])}});
 const lookup=Object.fromEntries(sites.map(s=>[s.net,s]));
 const loops=active.map(net=>{let back=x.returnMode==='local'?'G'+side(net):x.returnMode,a=lookup[net],b=lookup[back];
 let issues=[];if(!a.alignedNet)issues.push('active mapping');if(!b.alignedNet)issues.push('return mapping');if(a.exposedAreaMm2<=0)issues.push('active window');if(b.exposedAreaMm2<=0)issues.push('return window');
 let z=null;if(issues.length===0){let u=zContact(a.exposedAreaMm2,x.hz),v=zContact(b.exposedAreaMm2,x.hz);let re=u.re+v.re+constants.seriesOhm,im=u.im+v.im;z={magnitudeOhm:Math.hypot(re,im),phaseDeg:Math.atan2(im,re)*180/Math.PI,re,im};}
 return {site:net,returnNet:back,qualified:issues.length===0,issues,z};});
 return {config,nets:[...nets],matrix,sites,loops,oneAreaMm2:oneArea,registeredNets:matches.filter(Boolean).length,knownActives:sites.filter(s=>s.role==='active shaft'&&s.alignedNet).length,
 validLoops:loops.filter(l=>l.qualified).length,outerStrainPct:100*x.thickness*0.001/(2*x.radius),nominalAreaMm2:Math.PI*.04**2,nominalGroundAreaMm2:109*Math.PI*.04**2,windowCount:232,distinctNets:16};
}
function positions(){return active.map(net=>({net,xMm:(+net[1]-1)*.75+(side(net)==='R'?.375:0),side:side(net)}))}
const api={nets,active,side,adjacent,constants,sampleStage,defaults,normalize,circleOverlap,zContact,solve,positions,apertures};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else g.T4=api;
})(typeof globalThis!=='undefined'?globalThis:this);
