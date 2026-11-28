'use strict';
const assert=require('node:assert/strict'),E=require('../src/engine.js');
let checks=0;
const yes=(v,msg)=>{assert.ok(v,msg);checks++;},eq=(x,y,msg)=>{assert.deepEqual(x,y,msg);checks++;},near=(x,y)=>yes(Math.abs(x-y)<1e-8,[x,y]);
const base=E.evaluate(),count=E.continuity(base);
eq(E.N,10);eq(E.P,400);eq(E.SPAN,3600);eq(E.SIZE,4000);eq(E.coord(0),-1800);eq(E.coord(9),1800);
eq(base.nodes.length,100);eq(base.edges.length,180);eq(new Set(base.edges.map(e=>e.a+','+e.b)).size,180);eq(base.edges.filter(e=>e.axis==='x').length,90);eq(base.edges.filter(e=>e.axis==='y').length,90);
eq(count.active,96);eq(count.parked,4);eq(count.clusters,100);eq(count.isolated,96);eq(count.open,0);eq(count.ambiguous,0);
eq(base.summary.minGlassCap,200);eq(base.summary.minDepthMargin,50);eq(base.summary.minLateralMargin,120);eq(base.summary.joined,180);
eq(base.axes.x.minFrontWidth,180);eq(base.axes.x.minMatchedWidth,180);eq(base.axes.x.spanError,0);
for(const k of ['study','overview','options'])for(const dir of ['x+','x-','y+','y-']){
 const a=E.evaluate({range:k,grade:dir});
 const low=k==='overview'?500:750,span=1500-low;near(a.g.angle,Math.atan(span/3600)*180/Math.PI);
 eq(a.g.min,low);eq(a.g.max,1500);eq(a.g.spread,span);eq(a.g.monotone,'increasing');
 for(const n of a.nodes){
  const i=dir[0]==='x'?n.col:n.row,j=dir[1]==='-'?9-i:i;
  near(n.h,(span/9)*j+low);
  eq(n.u,1500);
 }
}
for(const n of ['1000','1500'])eq(E.evaluate({uniform:Number(n)}).nodes.map(x=>x.u),Array(100).fill(Number(n)));
for(const n of base.nodes){
 const rear=E.mapFace('rear',n.x,n.y),front=E.mapFace('front',n.x,n.y);eq(rear.x,-front.x);eq(rear.y,front.y);eq(E.mapFace('rear',rear.x,rear.y),front);
 const [rx,ry]=E.isoXY(n.x,n.y,90);eq(rx,n.y);eq(ry,-n.x);
 eq(E.isoXY(rx,ry,270),[n.x,n.y]);
}
const observed=E.evaluate({range:'measured',measured:'950, 1000, 960, 990, 1100, 1090, 1200, 1350, 1500, 1550',grade:'y-'});
eq(observed.g.kind,'entered');eq(observed.g.monotone,'nonmonotone');eq(observed.nodes[0].h,1550);eq(observed.nodes[90].h,950);eq(observed.g.delta,600);
for(const a of ['0','99,100,110,120,130,140,150,160,170,180','<script>',Array(11).fill(900).join(','),'800,900,1000,1100,1200,1300,1400,1500,1600,2001'])yes(E.evaluate({range:'measured',measured:a}).error);
for(const [k,[min,max]] of Object.entries(E.limits)){yes(E.evaluate({[k]:min-1}).error);yes(E.evaluate({[k]:max+1}).error);yes(E.evaluate({[k]:NaN}).error);}
yes(E.evaluate({grade:'bad'}).error);yes(E.evaluate({uniform:1750}).error);
const alignment=E.evaluate({offsetX:170});
eq(alignment.summary.tangent,90);eq(alignment.summary.web,0);eq(E.continuity(alignment).isolated,96);
const depthTouch=E.evaluate({toe:250});
eq(depthTouch.summary.tangent,180);eq(depthTouch.summary.web,0);eq(depthTouch.summary.minGlassCap,250);eq(E.continuity(depthTouch).isolated,96);
const capTouch=E.evaluate({toe:0});
eq(capTouch.summary.breach,180);eq(capTouch.summary.web,0);eq(capTouch.summary.minGlassCap,0);eq(E.continuity(capTouch).isolated,96);
const out=E.evaluate({offsetX:201});
yes(out.outOfEnvelope);yes(E.continuity(out).error);
const shift=E.evaluate(E.examples.shift.options);
eq(shift.axes.x.spanError,216);eq(shift.axes.y.spanError,0);eq(shift.axes.x.maxInternalError,186);eq(shift.summary.web,10);
yes(shift.edges.filter(e=>e.siliconCandidate).every(e=>e.axis==='x'&&e.col===8&&e.sideSilicon===16));
eq(E.continuity(shift).ambiguous,18);eq(E.continuity(shift,{accountWeb:false}).ambiguous,0);
const shelf=E.evaluate(E.examples.shelf.options), thin=E.evaluate(E.examples.cap.options);
eq(shelf.summary.maxVerticalSilicon,17);eq(shelf.summary.web,180);eq(E.continuity(shelf).clusters,1);eq(E.continuity(shelf).ambiguous,96);
eq(thin.summary.minGlassCap,0);eq(thin.summary.breach,28);eq(thin.summary.web,0);eq(E.continuity(thin).ambiguous,0);
const md=E.continuity(E.evaluate(E.examples.mixed.options));
eq(md.open,1);eq(md.ambiguous,1);eq(md.isolated,94);eq(md.records[35].status,'open');eq(md.records[45].labels,['R4C6','R5C6']);
yes(E.continuity(base,{open:true,faultRow:0,faultCol:0}).error);yes(E.continuity(base,{bridge:true,faultRow:9,bridgeAxis:'y'}).error);
yes(E.continuity(base,{faultRow:10}).error);
const historical=E.evaluate(E.examples.historical.options);
eq(historical.axes.x.minFrontWidth,130);eq(historical.summary.minGlassCap,200);eq(historical.summary.minLateralMargin,125);
for(const k of [0,10,40]){let r=Math.floor(k/10),c=k%10;for(const dir of ['x','y']){
 const p=E.continuity(base,{bridge:true,bridgeAxis:dir,faultRow:r,faultCol:c});eq(p.clusters,99);eq(p.ambiguous,k===0?1:2);
}}
function oracle(nodes,edges,o){
 const t=Array.from({length:100},()=>new Set());for(const [a,b] of edges){t[a].add(b);t[b].add(a);}
 function paths(i){let visited=new Set([i]),queue=[i];while(queue.length){const a=queue.shift();for(const j of t[a])if(!visited.has(j)){visited.add(j);queue.push(j);}}return [...visited].sort((a,b)=>a-b);}
 return nodes.map(n=>n.corner||(o.open&&n.id===o.faultRow*10+o.faultCol)?[]:paths(n.id));
}
let inspected=0,networks=0,seed=72182;
const r=()=>{seed=(1103515245*seed+12345)>>>0;return (seed%100003)/100003;},a=(m,n)=>m+(n-m)*r();
for(let i=0;i<1400;i++){
 const cfg={frontKerf:a(90,265),rearKerf:a(80,190),glassDepth:a(100,350),toe:a(-25,400),pitchX:a(-23,23),pitchY:a(-23,23),offsetX:a(-173,173),offsetY:a(-173,173),slope:a(-50,50),slopeAxis:i%2?'x':'y',faultRow:3,faultCol:3,bridge:i%3===0,bridgeAxis:i%2?'x':'y',accountWeb:i%5!==0,open:i%11===0};
 let b=E.evaluate(cfg),listed=[],str=cfg.bridge?33+(cfg.bridgeAxis==='x'?1:10):null;
 for(const e of b.edges){
  const X=e.axis==='x',idx=X?e.col:e.row,other=X?e.row:e.col,axis=X?'X':'Y',otherAx=X?'Y':'X',dir=X?'x':'y';
  const off=cfg['offset'+axis]+cfg['pitch'+axis]*(idx-4),lateral=Math.min(cfg.frontKerf,cfg.rearKerf,(cfg.frontKerf+cfg.rearKerf)/2-Math.abs(off));
  let nominalPerp=(other-4.5)*400,extentAlong=(400-cfg.rearKerf)/2;
  // Independent closed form for a linear floor over the rectangular rear segment.
  const front=(idx-4)*400+off;
  const center=cfg.toe+cfg.slope*(cfg.slopeAxis===dir?front:nominalPerp)/400;
  const v=cfg.slopeAxis===dir?0:Math.abs(cfg.slope)*extentAlong/400;
  const hmax=center+v,hmin=center-v,g=cfg.glassDepth;
  near(e.lateralClearance,lateral);near(e.centerOffset,off);near(e.floorMax,hmax);near(e.floorMin,hmin);
  near(e.depthMargin,g-hmax);near(e.capMin,lateral>1e-8?Math.max(0,Math.min(g,hmin)):g);
  const web=lateral<-1e-8||g-hmax<-1e-8;
  eq(e.siliconCandidate,web);
  if(cfg.accountWeb&&web)listed.push([e.a,e.b]);inspected++;
 }
 if(str!==null)listed.push([33,str]);
 if(!b.outOfEnvelope){
  const t=E.continuity(b);eq(t.records.map(n=>n.paths),oracle(b.nodes,listed,cfg));
  eq(t.isolated+t.open+t.ambiguous,96);networks++;
 }else yes(E.continuity(b).error);
}
console.log(JSON.stringify({assertions:checks,inspectedBoundaries:inspected,closedFormRandomizedSpecimens:1400,verifiedBooleanNetworks:networks,sourceRangeAndDirectionCombinations:12}));
