export function fixture(){
 const nx=8,ny=8,pitch=.05;
 return {schema:"bts.lithography.latent-dose.v1",equipmentId:"virtual-checkerboard",sampleId:"DELTA-W150-001",parentRevision:0,revision:1,sample:{diameterMm:150,widthMm:150,heightMm:150,thicknessUm:675},grid:{nx,ny,originMm:[-.2,-.2],spacingMm:[pitch,pitch],order:"row-major",frame:"wafer-centered; +x right, +y away; row 0 minimum y",unit:"mJ/cm2",values:Array.from({length:nx*ny},(_,i)=>((Math.floor((i%nx)/2)+Math.floor(Math.floor(i/nx)/2))%2?100:10))},provenance:"synthetic checkerboard; not measured"};
}

// Finite-rate dose ladder: rows share a stepped optical dose, in mJ/cm².
export function ladder(){
 const f=fixture(),levels=[0,5,10,20,30,40,50,60,80,100,150,200],ny=6;
 return {...f,sampleId:"DELTA-DOSE-LADDER-001",grid:{...f.grid,nx:levels.length,ny,originMm:[-.3,-.15],values:Array.from({length:levels.length*ny},(_,i)=>levels[i%levels.length])},provenance:"synthetic finite-rate optical dose ladder; not measured"};
}

export function defaults(){return {model:"ideal",tone:"positive",initialNm:1000,threshold:50,timeS:30,C:.02,rMin:.2,rMax:55,n:6,mTh:.61,developer:"AZ300MIF"}}

export function validate(source,p){
 const fail=m=>{throw Error(m)},range=(v,a,b,m)=>{if(!Number.isFinite(v)||v<a||v>b)fail(m+" outside "+a+"–"+b);};
 if(source?.schema!=="bts.lithography.latent-dose.v1")fail("Expected bts.lithography.latent-dose.v1 optical exposure (02-01 adapter); other schemas and e-beam units not supported");
 if(typeof source.sampleId!=="string"||!source.sampleId.trim()||!Number.isSafeInteger(source.revision)||source.revision<0||source.revision>=Number.MAX_SAFE_INTEGER)fail("Invalid sample identity or revision");
 const s=source.sample||{},g=source.grid||{};
 if(![50,75,100,150,200].includes(s.diameterMm))fail("Full circular wafer required: 50, 75, 100, 150 or 200 mm; pieces rejected");
 if((s.widthMm!==undefined&&s.widthMm!==s.diameterMm)||(s.heightMm!==undefined&&s.heightMm!==s.diameterMm))fail("Wafer dimensions inconsistent");
 range(s.thicknessUm,1,5000,"Substrate thickness (um)");
 if(g.unit!=="mJ/cm2"||g.order!=="row-major"||typeof g.frame!=="string"||!/wafer.centered/i.test(g.frame)||!/\+x right/i.test(g.frame)||!/\+y away/i.test(g.frame)||!/row 0 minimum y/i.test(g.frame))fail("Expected mJ/cm2 row-major wafer-centered grid");
 if(!Number.isInteger(g.nx)||!Number.isInteger(g.ny)||g.nx<1||g.ny<1||g.nx>4096||g.ny>4096||g.nx*g.ny>262144||!Array.isArray(g.values)||g.values.length!==g.nx*g.ny)fail("Invalid grid shape or >262144 cells");
 if(!Array.isArray(g.originMm)||g.originMm.length!==2||!g.originMm.every(Number.isFinite)||!Array.isArray(g.spacingMm)||g.spacingMm.length!==2)fail("Missing grid origin or spacing");
 for(const v of g.spacingMm)range(v,1e-7,200,"Pixel pitch mm");
 for(const x of [g.originMm[0],g.originMm[0]+g.nx*g.spacingMm[0]])for(const y of [g.originMm[1],g.originMm[1]+g.ny*g.spacingMm[1]])if(Math.hypot(x,y)>s.diameterMm/2+1e-9)fail("ROI outside circular wafer");
 for(const d of g.values)range(d,0,10000,"Optical dose mJ/cm2");
 if(!["ideal","mack"].includes(p.model)||!["positive","negative"].includes(p.tone))fail("Unknown dissolution model or tone");
 if(p.model==="mack"&&p.tone!=="positive")fail("Finite-rate model supports positive tone only");
 if(!["AZ300MIF","AZ400K","CD26"].includes(p.developer))fail("Unsupported developer label");
 range(p.initialNm,1,100000,"Initial film nm");range(p.threshold,0,10000,"Threshold mJ/cm2");range(p.timeS,0,600,"Time s");range(p.C,.00001,1,"C cm2/mJ");range(p.rMin,0,1000,"Dark rate nm/s");range(p.rMax,0,10000,"Rate span nm/s");range(p.n,1.01,20,"Selectivity");range(p.mTh,.01,.99,"Threshold PAC fraction");
 return true;
}

export function rate(d,p){
 const a=(p.n+1)/(p.n-1)*Math.pow(1-p.mTh,p.n),q=Math.pow(-Math.expm1(-p.C*d),p.n);
 return p.rMin+p.rMax*(a+1)*q/(a+q);
}

// Closed-form inversion of Mack Eq. 11 for a nonabsorbing film.
// null: no finite clearing dose for this positive-resist recipe, or not applicable.
export function doseToClear(p){
 if(p.tone!=="positive"||p.timeS<=0)return null;
 if(p.model==="ideal")return p.threshold;
 const required=p.initialNm/p.timeS;
 if(required<=p.rMin)return 0;
 if(p.rMax<=0||required>=p.rMin+p.rMax)return null;
 const a=(p.n+1)/(p.n-1)*Math.pow(1-p.mTh,p.n),y=(required-p.rMin)/p.rMax;
 const q=y*a/(a+1-y);
 const d=-Math.log1p(-Math.pow(q,1/p.n))/p.C;
 return Number.isFinite(d)?Math.max(0,d):null;
}
export function remaining(d,p){
 if(p.timeS===0)return p.initialNm;
 if(p.model==="ideal")return (p.tone==="positive"?d>=p.threshold:d<p.threshold)?0:p.initialNm;
 return Math.max(0,p.initialNm-rate(d,p)*p.timeS);
}

export function develop(source,p){
 validate(source,p);
 const g=source.grid,thicknessNm=g.values.map(d=>remaining(d,p));
 const open=thicknessNm.map(h=>h===0?1:0),[dx,dy]=g.spacingMm,[ox,oy]=g.originMm,polygons=[];
 for(let y=0;y<g.ny;y++)for(let x=0;x<g.nx;){if(!open[y*g.nx+x]){x++;continue;}const a=x;while(x<g.nx&&open[y*g.nx+x])x++;const x0=ox+a*dx,x1=ox+x*dx,y0=oy+y*dy,y1=oy+(y+1)*dy;polygons.push({id:"open-"+y+"-"+a,ringMm:[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]});}
 const count=open.reduce((a,b)=>a+b,0);
 const {grid,...upstream}=source;
 return {schema:"bts.lithography.developed-resist.v1",equipmentId:"02-10",kind:"simulated-developed-resist",sampleId:source.sampleId,parentRevision:source.revision,revision:source.revision+1,sample:source.sample,source:upstream,recipe:{...p},grid:{nx:g.nx,ny:g.ny,originMm:g.originMm,spacingMm:g.spacingMm,frame:g.frame,order:g.order,units:{dose:"mJ/cm2",thickness:"nm"},dose:g.values,thicknessNm,open},openPolygons:polygons,metrics:{openCells:count,openFraction:count/open.length,openAreaMm2:count*dx*dy,meanThicknessNm:thicknessNm.reduce((a,b)=>a+b,0)/thicknessNm.length,doseToClear_mJ_cm2:doseToClear(p),darkRemainingNm:remaining(0,p)},history:[...(Array.isArray(source.history)?source.history:[]),{operation:"spray develop; rinse; spin dry",deviceId:"02-10",parentRevision:source.revision,revision:source.revision+1,model:p.model,developmentS:p.timeS}],provenance:"Simulated local ROI only; no material calibration, measured result or whole-wafer inference."};
}

export function verification(){
 const f=fixture(),p=defaults(),r=develop(f,p),rows=[];
 const check=(test,expected,actual,unit,tolerance=0)=>rows.push({test,expected,actual,unit,tolerance,pass:Math.abs(actual-expected)<=tolerance});
 check("Ideal two-level checkerboard: open cells",32,r.metrics.openCells,"cells");
 check("High-dose film",0,r.grid.thicknessNm[2],"nm");
 check("Low-dose film",1000,r.grid.thicknessNm[0],"nm");
 check("Open area (32 × 0.05²)",.08,r.metrics.openAreaMm2,"mm2",1e-12);
 const area=r.openPolygons.reduce((v,p)=>{const q=p.ringMm;return v+(q[1][0]-q[0][0])*(q[2][1]-q[1][1])},0);
 check("Polygon union area",.08,area,"mm2",1e-12);
 check("Negative ideal complementary open count",32,develop(f,{...p,tone:"negative"}).metrics.openCells,"cells");
 check("Zero time retains film",1000,develop(f,{...p,timeS:0}).metrics.meanThicknessNm,"nm");
 const k={...p,model:"mack",timeS:10},z={...f,grid:{...f.grid,values:f.grid.values.map(()=>0)}};
 check("Dark film = 1000 - 0.2 × 10",998,develop(z,k).metrics.meanThicknessNm,"nm",1e-9);
 const d1=develop(f,k),d2=develop(f,{...k,timeS:20});
 check("Longer time cannot increase film",0,d2.grid.thicknessNm.filter((v,i)=>v>d1.grid.thicknessNm[i]).length,"cells");
 const hi={...f,grid:{...f.grid,values:f.grid.values.map(()=>10000)}};
 check("Fully exposed rate limit: 1000 - 55.2 × 10",448,develop(hi,k).metrics.meanThicknessNm,"nm",1e-8);
 // Independent intermediate case: m=1/2, n=3, mTh=1/2 gives a=1/4, q=1/8.
 // R = 2 + 120*(5/4)*(1/8)/(3/8) = 52 nm/s.
 const mid={...p,model:"mack",n:3,mTh:.5,rMin:2,rMax:120,timeS:10},half=Math.LN2/mid.C;
 check("Mack intermediate rate (m=0.5)",52,rate(half,mid),"nm/s",1e-10);
 check("Intermediate remaining film",480,remaining(half,mid),"nm",1e-9);
 const inverse={...mid,timeS:1000/52};
 check("Closed-form clearing dose (m=0.5)",half,doseToClear(inverse),"mJ/cm2",1e-10);
 check("Inverse dose residual",0,remaining(doseToClear(inverse),inverse),"nm",1e-8);
 check("No finite dose at saturated rate",1,Number(doseToClear({...mid,timeS:1})===null),"boolean");
 check("Dark clearing dose",0,doseToClear({...mid,rMin:100,timeS:10}),"mJ/cm2");
 check("Dose ladder monotonic remaining film",0,Array.from({length:11},(_,i)=>{const g=ladder().grid.values;return Number(remaining(g[i+1],mid)>remaining(g[i],mid));}).reduce((a,b)=>a+b,0),"violations");
 check("Threshold equality opens positive film",0,remaining(p.threshold,p),"nm");
 check("Revision increments",2,r.revision,"revision");
 let rejected=0;try{develop({...f,sample:{...f.sample,diameterMm:25}},p)}catch{rejected=1}check("Unsupported specimen rejected",1,rejected,"boolean");
 return rows;
}
