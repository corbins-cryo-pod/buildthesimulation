/* Educational cut geometry and Boolean continuity on a hardware-free fixture. */
(function(host){'use strict';
const EPS=1e-8, N=10, P=400, SIZE=4000, SPAN=(N-1)*P;
const refs={
 standard:['Blackrock · Utah Array options','https://blackrockneurotech.com/products/utah-array/','400 µm pitch; separate research and clinical length options. The FAQ’s 4 × 4 mm footprint and 0.2 mm substrate are representative, not universal manufacturing tolerances.'],
 ifu:['Blackrock · NeuroPort configuration, rev. 3','https://blackrockneurotech.com/wp-content/uploads/2023/04/LB-0612_NeuroPort_Array_IFU.pdf','A reference with 100 physical electrode positions and 96 connected recording outputs; the virtual fixture does not reproduce its clinical hardware or wiring.'],
 vendor:['Blackrock · Slant overview and specification table','https://blackrockneurotech.com/products/slant-array/','The overview describes a linear 0.5–1.5 mm grade. The options table instead lists custom lengths of 0.75–1.5 mm. The two are preserved separately.'],
 study:['Wendelken et al. (2017) · Slant array hardware','https://doi.org/10.1186/s12984-017-0320-4','Device geometry: 100 sites on a 4 × 4 mm base, 400 µm pitch, approximately 0.75–1.5 mm lengths. The corner reference convention applies to this study, not every order.'],
 glass:['Jones, Campbell & Normann (1992) · glass/silicon array','https://pubmed.ncbi.nlm.nih.gov/1510294/','The glass-isolated base was a distinct alternative to an earlier junction-isolation architecture.'],
 patent:['University of Utah · historical glass-isolated cross-section','https://patents.google.com/patent/US5215088A/en','Figures 6–9 distinguish two orthogonal grids on opposite faces. The example names a 125 µm rear blade and 250 µm rear depth, and a 270 µm front kerf. It does not qualify a current vendor process.'],
 cut:['Bhandari et al. (2010) · wafer-scale shaping','https://pubmed.ncbi.nlm.nih.gov/20706618/','Orthogonal rough cuts and later shaping are different steps. Real post-etch tips cannot be inferred from the as-cut square ligament.']
};
const ranges={
 study:{short:750,long:1500,name:'2017 study envelope',scope:'Approximate endpoints are reported. Exact heights of the ten rows are not given; the drawn linear row schedule is modeled.'},
 overview:{short:500,long:1500,name:'Manufacturer overview',scope:'Blackrock describes a linear grade from 0.5 to 1.5 mm. Exact row heights shown here are the ideal interpolation, not measurements.'},
 options:{short:750,long:1500,name:'Manufacturer options table',scope:'Blackrock lists 0.75–1.5 mm custom lengths. This table does not establish an actual row schedule; the drawing uses ideal linear interpolation.'},
 measured:{name:'User-entered row heights',scope:'These ten values are user inputs, not manufacturer data or proof of fabricated dimensions.'}
};
const limits={
 frontKerf:[60,360],rearKerf:[40,300],glassDepth:[60,550],toe:[-60,550],
 pitchX:[-36,36],pitchY:[-36,36],offsetX:[-250,250],offsetY:[-250,250],slope:[-55,55]
};
const pretty={frontKerf:'Front cut opening',rearKerf:'Rear cut opening',glassDepth:'Rear groove depth',toe:'Front cut floor',pitchX:'X pitch offset',pitchY:'Y pitch offset',offsetX:'X registration',offsetY:'Y registration',slope:'Floor drift'};
const base={
 range:'study',grade:'x+',uniform:1500,
 measured:'750, 833, 917, 1000, 1083, 1167, 1250, 1333, 1417, 1500',
 frontKerf:220,rearKerf:120,glassDepth:250,toe:200,pitchX:0,pitchY:0,offsetX:0,offsetY:0,slope:0,slopeAxis:'x',accountWeb:true,
 open:false,bridge:false,faultRow:4,faultCol:4,bridgeAxis:'x'
};
const examples={
 nominal:{name:'Aligned coupon',options:{}},
 shift:{name:'Pitch drift toward one edge',options:{pitchX:24,offsetX:90}},
 shelf:{name:'Silicon shelf between cuts',options:{toe:267}},
 cap:{name:'Glass cap breach',options:{toe:25,slope:8}},
 mixed:{name:'One open and one bridge',options:{open:true,bridge:true,faultRow:3,faultCol:5,bridgeAxis:'y'}},
 historical:{name:'Historical section dimensions',options:{frontKerf:270,rearKerf:125,glassDepth:250,toe:200}}
};
const clamp=(x,a,b)=>Math.min(Math.max(x,a),b), finite=x=>typeof x==='number'&&Number.isFinite(x), int=x=>Number.isSafeInteger(x);
const coord=i=>(i-(N-1)/2)*P, rail=i=>(i-N/2)*P, numberId=(row,col)=>row*N+col, siteName=(row,col)=>'R'+(row+1)+'C'+(col+1);
const nodeName=i=>siteName(Math.floor(i/N),i%N);
const bounds=r=>int(r)&&r>=0&&r<N;
function gradeData(o){
 if(!Object.prototype.hasOwnProperty.call(ranges,o.range)||!['x+','x-','y+','y-'].includes(o.grade))return {error:'Choose a supported Slant range and direction.'};
 let heights;
 const r=ranges[o.range];
 if(o.range==='measured'){
  const raw=String(o.measured??'').trim();
  if(raw.length>1600)return {error:'Enter ten row heights in µm, separated by spaces or commas.'};
  const parts=raw.split(/[\s,]+/);heights=parts.map(v=>/^\d+(?:\.\d+)?$/.test(v)?Number(v):NaN);
  if(heights.length!==N||heights.some(x=>!(finite(x)&&x>=100&&x<=2000)))return {error:'Enter exactly ten heights from 100 through 2,000 µm, ordered in the selected grade direction.'};
 }else heights=Array.from({length:N},(_,i)=>r.short+(r.long-r.short)*i/(N-1));
 const changes=heights.slice(1).map((h,i)=>h-heights[i]);
 const asc=changes.every(d=>d>=-EPS),desc=changes.every(d=>d<=EPS),delta=heights.at(-1)-heights[0],max=Math.max(...heights),min=Math.min(...heights);
 const az={ 'x+':0,'y+':90,'x-':180,'y-':270 }[o.grade],angle=Math.atan(delta/SPAN)*180/Math.PI;
 return {name:r.name,scope:r.scope,heights,min,max,spread:max-min,delta,angle,az,axis:o.grade[0],reverse:o.grade[1]==='-',kind:o.range==='measured'?'entered':'interpolated',monotone:asc?(desc?'level':'increasing'):desc?'decreasing':'nonmonotone'};
}
function gridHeight(g,row,col){
 const ind=g.axis==='x'?col:row;return g.heights[g.reverse?N-1-ind:ind];
}
function mapFace(flag,x,y){
 return {x:flag==='rear'?-x:x,y};
}
function isoXY(x,y,t=0){
 if(t===90)return [y,-x];
 if(t===180)return [-x,-y];
 if(t===270)return [-y,x];
 return [x,y];
}
function faceAxis(p,axis){
 const pitch=P+p[axis==='x'?'pitchX':'pitchY'],offset=p[axis==='x'?'offsetX':'offsetY'];
 const cuts=Array.from({length:N+1},(_,i)=>{
  const back=rail(i),front=offset+pitch*(i-N/2);
  const backLo=back-p.rearKerf/2,backHi=back+p.rearKerf/2,frontLo=front-p.frontKerf/2,frontHi=front+p.frontKerf/2;
  const lo=Math.max(backLo,frontLo),hi=Math.min(backHi,frontHi),margin=hi-lo;
  return {i,internal:i>0&&i<N,back,front,backLo,backHi,frontLo,frontHi,centerOffset:front-back,margin,overlap:Math.max(margin,0),gap:Math.max(-margin,0)};
 });
 const cells=Array.from({length:N},(_,i)=>{
  const l=cuts[i],r=cuts[i+1];
  const frontLo=clamp(l.frontHi,-SIZE/2,SIZE/2),frontHi=clamp(r.frontLo,-SIZE/2,SIZE/2),backLo=clamp(l.backHi,-SIZE/2,SIZE/2),backHi=clamp(r.backLo,-SIZE/2,SIZE/2);
  return {i,frontLo,frontHi,backLo,backHi,frontWidth:Math.max(0,frontHi-frontLo),backWidth:Math.max(0,backHi-backLo),matchedWidth:Math.max(0,Math.min(frontHi,backHi)-Math.max(frontLo,backLo))};
 });
 return {axis,offset,pitch,pitchError:pitch-P,nominalSpan:SPAN,uncroppedFrontSpan:pitch*(N-1),spanError:(pitch-P)*(N-1),cuts,cells,
  maxInternalError:Math.max(...cuts.filter(c=>c.internal).map(c=>Math.abs(c.centerOffset))),
  minFrontWidth:Math.min(...cells.map(c=>c.frontWidth)),minMatchedWidth:Math.min(...cells.map(c=>c.matchedWidth))};
}
function localFloor(o,x,y){return o.toe+o.slope*(o.slopeAxis==='x'?x:y)/P;}
function edgeAt(o,axes,axis,startRow,startCol){
 const across=axis==='x'?startCol:startRow, along=axis==='x'?startRow:startCol, info=axes[axis].cuts[across+1];
 const alongAxis=axes[axis==='x'?'y':'x'],support=alongAxis.cells[along];
 let a=axis==='x'?localFloor(o,info.front,support.backLo):localFloor(o,support.backLo,info.front);
 let b=axis==='x'?localFloor(o,info.front,support.backHi):localFloor(o,support.backHi,info.front);
 const hMid=(a+b)/2,hMin=Math.min(a,b),hMax=Math.max(a,b);
 const depthMargin=o.glassDepth-hMax;
 const verticalOverlap=Math.max(0,o.glassDepth-Math.max(0,hMax));
 const separationHorizontal=info.margin>EPS,separationVertical=depthMargin>EPS;
 const tangent=Math.abs(info.margin)<=EPS||Math.abs(depthMargin)<=EPS;
 const web=info.margin<-EPS||depthMargin<-EPS;
 const breach=hMin<=EPS;
 // Give the worst retained section only where the two cuts have finite plan overlap.
 const capMin=separationHorizontal?clamp(hMin,0,o.glassDepth):o.glassDepth,capMax=separationHorizontal?clamp(hMax,0,o.glassDepth):o.glassDepth;
 const toRow=startRow+(axis==='y'?1:0),toCol=startCol+(axis==='x'?1:0);
 return {axis,row:startRow,col:startCol,a:numberId(startRow,startCol),b:numberId(toRow,toCol),aName:siteName(startRow,startCol),bName:siteName(toRow,toCol),
  centerOffset:info.centerOffset,frontCenter:info.front,backCenter:info.back,frontLo:info.frontLo,frontHi:info.frontHi,backLo:info.backLo,backHi:info.backHi,
  overlapWidth:info.overlap,lateralClearance:info.margin,sideSilicon:info.gap,floorAtCenter:hMid,floorMin:hMin,floorMax:hMax,depthMargin,verticalOverlap,verticalSilicon:Math.max(0,-depthMargin),
  capMin,capMax,tangent,siliconCandidate:web,breach,joined:separationHorizontal&&separationVertical&&!breach,
  state:web?'web':breach?'breach':tangent?'tangent':'joined'};
}
function validate(input={}){
 const o={...base,...input};
 if(![1000,1500].includes(o.uniform))return {error:'The uniform reference is 1.0 mm or 1.5 mm.'};
 for(const [k,[min,max]] of Object.entries(limits))if(!finite(o[k])||o[k]<min||o[k]>max)return {error:pretty[k]+' must be '+min+' to '+max+' µm in this virtual fixture.'};
 if(!['x','y'].includes(o.slopeAxis))return {error:'Choose the X or Y floor drift direction.'};
 const g=gradeData(o);if(g.error)return g;
 return {o,g};
}
function evaluate(input={}){
 const selected=validate(input);if(selected.error)return selected;const {o,g}=selected;
 const axes={x:faceAxis(o,'x'),y:faceAxis(o,'y')};
 const outOfEnvelope=Object.values(axes).some(a=>a.maxInternalError>=P/2-EPS||a.minMatchedWidth<=EPS);
 const edges=[];
 for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(c<N-1)edges.push(edgeAt(o,axes,'x',r,c));if(r<N-1)edges.push(edgeAt(o,axes,'y',r,c));}
 const summary={edgeCount:edges.length,web:edges.filter(e=>e.siliconCandidate).length,tangent:edges.filter(e=>e.tangent).length,breach:edges.filter(e=>e.breach).length,joined:edges.filter(e=>e.joined).length,
 minLateralMargin:Math.min(...edges.map(e=>e.lateralClearance)),minDepthMargin:Math.min(...edges.map(e=>e.depthMargin)),minGlassCap:Math.min(...edges.map(e=>e.capMin)),maxVerticalSilicon:Math.max(...edges.map(e=>e.verticalSilicon)),maxSideSilicon:Math.max(...edges.map(e=>e.sideSilicon))};
 const nodes=Array.from({length:N*N},(_,i)=>{
  let r=Math.floor(i/N),c=i%N,corner=[0,N-1].includes(r)&&[0,N-1].includes(c);
  return {id:i,name:siteName(r,c),row:r,col:c,x:coord(c),y:coord(r),u:o.uniform,h:gridHeight(g,r,c),corner};
 });
 return {o,g,axes,summary,edges,nodes,outOfEnvelope};
}
function continuity(q,input={}){
 if(!q||q.error)return {error:'Run a valid section first.'};
 const o={...q.o,...input};
 if(q.outOfEnvelope)return {error:'Correspondence is outside this fixture’s nearest-neighbor registration model. Resolve the cut registration before assigning continuity groups.'};
 if(!bounds(o.faultRow)||!bounds(o.faultCol))return {error:'Select an existing fixture site.'};
 if(!['x','y'].includes(o.bridgeAxis))return {error:'Select positive X or positive Y for the additional bridge.'};
 const a=numberId(o.faultRow,o.faultCol);
 if(o.open&&q.nodes[a].corner)return {error:'This corner is a parked site, not one of the 96 virtual outputs. To inject a lead open, choose a noncorner site.'};
 if(o.bridge&&((o.bridgeAxis==='x'&&o.faultCol===N-1)||(o.bridgeAxis==='y'&&o.faultRow===N-1)))return {error:'The neighbor is outside the coupon. Choose an interior edge or the other positive axis.'};
 const parent=Array.from({length:N*N},(_,i)=>i);
 function root(x){while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;}
 const join=(i,j)=>{const a=root(i),b=root(j);if(a!==b)parent[Math.max(a,b)]=Math.min(a,b);};
 const assumed=o.accountWeb?q.edges.filter(e=>e.siliconCandidate):[];
 for(const e of assumed)join(e.a,e.b);
 const manual=o.bridge?[a,numberId(o.faultRow+(o.bridgeAxis==='y'?1:0),o.faultCol+(o.bridgeAxis==='x'?1:0))]:null;
 if(manual)join(...manual);
 const groups=new Map();
 q.nodes.forEach(n=>{const g=root(n.id);if(groups.has(g))groups.get(g).push(n.id);else groups.set(g,[n.id]);});
 const records=q.nodes.map(n=>{
  const parked=n.corner,paths=parked||(o.open&&n.id===a)?[]:[...groups.get(root(n.id))];
  return {...n,paths,labels:paths.map(nodeName),status:parked?'parked':!paths.length?'open':paths.length===1?'isolated':'ambiguous'};
 });
 const count=s=>records.filter(x=>x.status===s).length;
 return {records,assumedEdges:assumed.length,manual,openSite:o.open?a:null,sourcesPerCluster:[...groups.values()].map(g=>g.length).sort((a,b)=>b-a),clusters:groups.size,active:96,parked:4,isolated:count('isolated'),open:count('open'),ambiguous:count('ambiguous')};
}
const api={N,P,SIZE,SPAN,refs,ranges,limits,pretty,base,examples,coord,rail,siteName,nodeName,gradeData,gridHeight,mapFace,isoXY,faceAxis,edgeAt,evaluate,continuity};if(typeof module!=='undefined'&&module.exports)module.exports=api;else host.UtahBench=api;
})(typeof globalThis==='object'?globalThis:this);
