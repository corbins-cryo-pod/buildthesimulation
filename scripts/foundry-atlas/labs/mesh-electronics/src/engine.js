/* Four-mask Mesh Foundry. Original teaching artwork; all planar coordinates in µm. */
(function(root) {
  'use strict';
  const P = Object.freeze({
    count:32, pitch:500, padWidth:400, pinWidth:100, pinDepth:160,
    padY0:40, padSeatY1:390, padY1:1060, pinCenterY:220,
    pinFirstX:22500, neckX:12600, stemWidth:328, stemY:-168, stemPitch:9.5,
    siteRadius:10, leadWidth:3.2, railWidth:13, railPitch:142, braceWidth:10, suBase:.45, suTop:.45,
    au:.080, crAu:.003, pt:.050, crPt:.003, ni:.100, carrierThickness:525,
    sheetOhms:.42, zout:1200, zin:1e8, zinC:25e-12, minArea:1e-8,
    measuredAtHz:1000, measuredWetOhms:1.3e6, measuredWetPhase:-80, measuredPinOhms:3
  });
  const SOURCES = Object.freeze({
    jove:{title:'Schuhmann et al. · JoVE 137, 58003 (2018)',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6126522/',detail:'Protocol §1 and Fig. 2 identify the four masks, Cr/Au and Cr/Pt lift-offs, Ni release, and single-sided pad/site exposure. The electrical I/O section notes a 16-channel mesh on a 32-position connector. No mask artwork was recovered.'},
    fu:{title:'Schuhmann et al. · Nano Letters 17, 5836–5842 (2017)',url:'https://bpb-us-e1.wpmucdn.com/websites.harvard.edu/dist/7/67/files/2022/05/acs.nanolett.7b03081-2.pdf',detail:'Fig. 1: distal open mesh, stem, continuous and porous pad sections, about 2.2 × 38 mm envelope and two Au leads per rail. Figs. 2–3 and surrounding text: 32 Pt electrodes, 20 µm diameter; pad width 400 µm, pin width about 100 µm and pitch 500 µm. Fig. 3: ~3 Ω contact and 1.3 MΩ at −80° at 1 kHz (mean, 32 Pt sites in 1× PBS).'},
    zhou:{title:'Zhou et al. · Advanced One- and Two-Dimensional Mesh Designs (2017)',url:'https://bpb-us-e1.wpmucdn.com/websites.harvard.edu/dist/7/67/files/2022/05/Advanced-One-and-Two-Dimensional-Mesh-Designs-for-Injectable-Electronics.pdf',detail:'Fig. 1 distinguishes open lattice architectures and cross-brace directions. Those exact rail dimensions are not transferred to this plug-and-play model.'}
  });
  const STAGES=Object.freeze([
    {name:'Artwork and carrier',code:'01',result:'Incoming silicon carrier',layers:['carrier'],inspect:'overview',source:'fu',tools:['01-01','02-12'],detail:'Choose a population, then track the same coordinate system from the device region through the stem and to the pad field. Silicon is a removable carrier, not the recording shank.',check:'Confirm 32 fixture positions, isolated one-site nets, and which positions are populated.'},
    {name:'Sacrificial nickel',code:'02',result:'Carrier + temporary Ni',layers:['carrier','nickel'],inspect:'section',source:'jove',tools:['03-02','05-01'],detail:'Add the temporary Ni release level on the carrier. The silicon and nickel are below the lower polymer and are not counted as a common electrode.',check:'Record the release interface before depositing the permanent film.'},
    {name:'M1 · Lower SU-8',code:'03',result:'Patterned mechanical foundation',layers:['carrier','nickel','lower'],inspect:'mesh',source:'jove',tools:['02-07','02-01','02-10'],detail:'Pattern bottom SU-8 into rails, diagonal cross-braces, the stem and the mechanical supports for the pads. A diagonal polymer-only tie never shorts two metal tracks.',check:'Inspect open cells and measure film thickness on a defined witness.'},
    {name:'M2 · Gold routing',code:'04',result:'Cr/Au lead and I/O mask',layers:['carrier','nickel','lower','gold'],inspect:'stem',source:'jove',tools:['02-01','03-02','04-06'],detail:'Pattern Cr/Au leads and contact-pad structures through a separate lift-off. The porous area of a pad shares its electrical node with its solid seat. Independent leads remain distinct through the stem.',check:'Check the stem spacing and whether a bridge or break exists before passivation.'},
    {name:'M3 · Platinum faces',code:'05',result:'Cr/Pt contact metal',layers:['carrier','nickel','lower','gold','platinum'],inspect:'site',source:'jove',tools:['02-01','03-01','04-06'],detail:'Define the Pt disks separately from the Au. Each disk must overlap its own landing trace. The 20 µm disk diameter comes from the 32-site specimen; the artwork here is reconstructed.',check:'Confirm every Pt disk overlaps precisely one intended conductor.'},
    {name:'M4 · Top SU-8',code:'06',result:'Insulated traces; open contact + pad faces',layers:['carrier','nickel','lower','gold','platinum','upper'],inspect:'section',source:'jove',tools:['02-07','02-01','02-12'],detail:'Pattern the upper SU-8 to encapsulate the Au routing while exposing designated Pt and I/O sites. The upper window is not itself metal. An undersized opening can fail wet tests despite a sound dry path.',check:'Compare electrode exposure area and actual lead-to-site registration.'},
    {name:'Release the mesh',code:'07',result:'Freestanding metal/polymer mesh',layers:['lower','gold','platinum','upper'],inspect:'mesh',source:'jove',tools:['03-12','04-06','12-01'],detail:'Remove the sacrificial interface in the virtual process and recover the free film on a bench support. This is a change in the assembly state, not cutting the patterned metal out of the design.',check:'The carrier and Ni should disappear; a broken rail, a metal open and a blocked window remain separate observations.'},
    {name:'Register the ZIF fixture',code:'08',result:'Lateral overlap between pins and pads',layers:['lower','gold','platinum','upper','fixture'],inspect:'io',source:'fu',tools:['12-01','16-13','08-06'],detail:'Place the planar pad field over a 32-position zero-insertion-force connector model and inspect its contact witness. This represents fixture registration only, not a manufacturer’s undocumented connector footprint.',check:'Test geometric pin-to-pad overlap, chassis-label order and population separately. No force or wear calibration is assumed.'},
    {name:'Dry continuity',code:'09',result:'Site–pad–pin graph',layers:['lower','gold','platinum','upper','fixture'],inspect:'io',source:'fu',tools:['05-07','09-03','16-13'],detail:'Trace each physical fixture pin through its gold pad, metal lead and Pt site. Detect opens, shared nets and label swaps before taking wet measurements.',check:'A one-to-one path can still be mapped to the wrong pin. Intentionally empty positions do not count as opens.'},
    {name:'Wet impedance',code:'10',result:'Synthetic impedance + bench output',layers:['lower','gold','platinum','upper','fixture'],inspect:'site',source:'fu',tools:['09-01','09-12','09-06','10-10'],detail:'Compare the reconstructed electrical path to a virtual electrolyte-load circuit and a known synthetic source. The only wet calibration point is the published 32-electrode mean at 1 kHz.',check:'Check that an occluded contact maintains dry continuity but has no valid wet result. Neither this circuit nor its waveform predicts electrophysiology.'}
  ]);
  const MASKS=Object.freeze({
    lower:{no:1,title:'Lower SU-8',material:'polymer foundation',color:'#d69b51',z:0,depth:P.suBase},
    gold:{no:2,title:'Cr / Au',material:'routing and I/O',color:'#efbe59',z:P.suBase,depth:P.au+P.crAu},
    platinum:{no:3,title:'Cr / Pt',material:'electrode sites',color:'#b7dcef',z:P.suBase+P.au+P.crAu,depth:P.pt+P.crPt},
    upper:{no:4,title:'Upper SU-8',material:'insulation and windows',color:'#70d1bf',z:P.suBase+P.au+P.crAu,depth:P.suTop},
  });
  const POPS=Object.freeze({
    full:{id:'full',name:'32-site Pt baseline',n:32,copy:'Published count and contact dimensions; the drawn netlist and artwork are a reconstruction.'},
    half:{id:'half',name:'16 populated / 32 fixture positions',n:16,copy:'The protocol documents the 16/32 combination. Centered occupancy P09–P24 and this artwork are teaching choices.'}
  });
  const opt0=Object.freeze({population:'full',offset:0,depth:0,ptShift:0,window:0,reverse:false,fault:'none',target:16,latch:true});
  const round=(x,n=5)=>Number(x.toFixed(n));
  const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
  const calcOptions=(o={})=>{
    const num=(a,b,c,d)=>Number.isFinite(Number(a))?clamp(Number(a),b,c):d;
    const fault=['none','open','bridge','rail'].includes(o.fault)?o.fault:'none';
    return {population:o.population==='half'?'half':'full',offset:num(o.offset,-550,550,0),depth:num(o.depth,-250,250,0),ptShift:num(o.ptShift,-36,36,0),window:num(o.window,0,10,0),reverse:o.reverse===true,fault,target:Math.round(num(o.target,1,32,16)),latch:o.latch!==false};
  };
  const padX=i=>P.pinFirstX+(i-1)*P.pitch;
  const label=(p,n)=>p+String(n).padStart(2,'0');
  const length=p=>p.slice(1).reduce((sum,[a,b],i)=>sum+Math.hypot(a-p[i][0],b-p[i][1]),0);
  const dSeg=(x,y,a,b)=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],q=dx*dx+dy*dy,t=q?clamp(((x-a[0])*dx+(y-a[1])*dy)/q,0,1):0;
    return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
  };
  function overlapCircle(r,s,d) {
    if(r<=0 || s<=0 || d>=r+s) return 0;
    if(d<=Math.abs(r-s))return Math.PI*Math.min(r,s)**2;
    return r*r*Math.acos(clamp((d*d+r*r-s*s)/(2*d*r),-1,1))+s*s*Math.acos(clamp((d*d+s*s-r*r)/(2*d*s),-1,1))-.5*Math.sqrt(Math.max(0,(-d+r+s)*(d+r-s)*(d-r+s)*(d+r+s)));
  }
  const overlapLine=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
  function buildRoutes(pop='full'){
    const routes=[];
    for(let n=1;n<=P.count;n++){
      if(pop==='half'&&(n<9||n>24))continue;
      const rail=Math.floor((n-1)/2);
      const lr=rail-(pop==='half'?4:0), nrails=pop==='half'?8:16;
      const yRail=(.5*(nrails-1)-lr)*(pop==='half'?270:P.railPitch);
      const sign=n%2?1:-1;
      const site=[500+((n-1)*7%32)*(2000/31),yRail+sign*24];
      const dY=yRail+sign*3.85;
      const leadY=-20-(n-1)*P.stemPitch;
      const pts=[site,[site[0]+10,dY],[7100,dY],[P.neckX,leadY],[padX(n),leadY],[padX(n),P.padY0+6]];
      const len=length(pts);
      routes.push({n,rail,site,points:pts,lengthUm:len,routeR:P.sheetOhms*len/P.leadWidth,yRail,leadY,pad:[padX(n),P.padY0],ids:{site:label('E',n),pad:label('A',n),physicalPin:label('P',n),trace:label('T',n)}});
    }
    return routes;
  }
  const cache={full:buildRoutes('full'),half:buildRoutes('half')};
  const routesFor=s=>cache[s==='half'?'half':'full'];
  const ra=cache.full.find(r=>r.n===16).routeR+P.zout+P.measuredPinOhms;
  // Calibrate one CPE to one documented measurement, not to an unavailable measured spectrum.
  const anchorTheta=P.measuredWetPhase*Math.PI/180;
  const cpeRe=P.measuredWetOhms*Math.cos(anchorTheta)-ra,cpeIm=P.measuredWetOhms*Math.sin(anchorTheta);
  const alpha=-Math.atan2(cpeIm,cpeRe)*2/Math.PI;
  const q=1/(Math.hypot(cpeRe,cpeIm)*(2*Math.PI*P.measuredAtHz)**alpha);
  const CAL=Object.freeze({alpha,q,anchorNet:'E16',anchorSeriesOhm:ra});
  const polarization=(f,area=1)=>{
    if(!(f>0)||!(area>0))return null;
    const mag=1/(q*area*(2*Math.PI*f)**alpha),phi=alpha*Math.PI/2;
    return {re:mag*Math.cos(phi),im:-mag*Math.sin(phi)};
  };
  function impedance(row,f){
    if(!row||!row.wet||!(f>0))return null;
    const pol=polarization(f,row.areaFraction);
    const re=row.dryOhm+P.zout+pol.re,im=pol.im;
    return {re,im,abs:Math.hypot(re,im),phase:Math.atan2(im,re)*180/Math.PI};
  }
  function findHits(route,ptX,ptY){
    let c=Infinity;
    // Only traces in the lithography window can overlap a Pt site.
    for(let i=0;i<2;i++)c=Math.min(c,dSeg(ptX,ptY,route.points[i],route.points[i+1]));
    return c<P.siteRadius+P.leadWidth/2-1e-8;
  }
  function analyze(input={},stage=10){
    const o=calcOptions(input),routes=routesFor(o.population);
    const activeByN=new Map(routes.map(r=>[r.n,r]));
    const graph=new Map();
    const edge=(a,b)=>{
      if(!graph.has(a))graph.set(a,new Set());
      if(!graph.has(b))graph.set(b,new Set());
      graph.get(a).add(b);graph.get(b).add(a);
    };
    const component=(s)=>{
      const visited=new Set([s]),todo=[s];
      while(todo.length){for(const next of graph.get(todo.pop())||[]){if(!visited.has(next)){visited.add(next);todo.push(next)}}}
      return visited;
    };
    let bridgeNeighbor=null;
    if(o.fault==='bridge'&&activeByN.has(o.target)) {
      bridgeNeighbor=activeByN.has(o.target+1)?o.target+1:activeByN.has(o.target-1)?o.target-1:null;
    }
    for(const r of routes){
      if(stage>=4) {
        if(!(o.fault==='open' && o.target===r.n))edge('l'+r.n,'u'+r.n);
        edge('u'+r.n,'a'+r.n);
      }
      if(stage>=5) {
        for(const wire of routes)if(findHits(wire,r.site[0]+o.ptShift,r.site[1]))edge('e'+r.n,'l'+wire.n);
      }
    }
    if(stage>=4&&bridgeNeighbor)edge('u'+o.target,'u'+bridgeNeighbor);
    const contacts=[],rows=[];
    for(let slot=1;slot<=P.count;slot++){
      const pinX=padX(slot)+o.offset,pinY=P.pinCenterY+o.depth;
      graph.set('p'+slot,new Set());
      const yOverlap=overlapLine(pinY-P.pinDepth/2,pinY+P.pinDepth/2,P.padY0,P.padSeatY1);
      if(stage>=8&&o.latch&&yOverlap>1e-8){
        for(const r of routes){
          const xOverlap=overlapLine(pinX-P.pinWidth/2,pinX+P.pinWidth/2,r.pad[0]-P.padWidth/2,r.pad[0]+P.padWidth/2);
          if(xOverlap>1e-8){
            const overlap=xOverlap*yOverlap/(P.pinWidth*P.pinDepth);
            contacts.push({slot,pad:r.n,ratio:overlap,ohm:P.measuredPinOhms/overlap});
            edge('p'+slot,'a'+r.n);
          }
        }
      }
    }
    for(let slot=1;slot<=P.count;slot++){
      const c=component('p'+slot);
      const gather=prefix=>[...c].filter(s=>s.startsWith(prefix)).map(s=>Number(s.slice(1))).sort((a,b)=>a-b);
      const labels=o.reverse?33-slot:slot, expected=activeByN.has(labels)?labels:null;
      const pads=gather('a'),sites=gather('e'),pins=gather('p'), directly=contacts.filter(ct=>ct.slot===slot);
      const joined=pads.length>1||sites.length>1||pins.length>1;
      const connected=sites.length>0;
      const unique=sites.length===1 && !joined && directly.length===1;
      const mapped=unique&&sites[0]===expected;
      const exposed=unique&&stage>=6?overlapCircle(P.siteRadius,P.siteRadius-o.window,Math.abs(o.ptShift)):0;
      const areaFraction=exposed/(Math.PI*P.siteRadius**2);
      const dryOhm=unique?activeByN.get(sites[0]).routeR+directly[0].ohm:null;
      const wet=unique&&stage>=10&&exposed>P.minArea;
      let status=stage<8?'not-seated':!o.latch?'unlatched':joined?'shared':!sites.length?(expected===null&&!pads.length?'empty':'open'):!mapped?'wrong-map':'good';
      rows.push({slot,label:label('P',labels),expected,physicalPin:label('P',slot),pinX:padX(slot)+o.offset,pinY:P.pinCenterY+o.depth,
        directPads:directly.map(ct=>ct.pad),pads,sites,pins,connected,unique,mapped,areaUm2:exposed,areaFraction,dryOhm,wet,status,
        overlap:directly.length===1?directly[0].ratio:0});
    }
    const n=(f)=>rows.filter(f).length;
    const wetNum=n(r=>r.wet);
    const electricalPass=stage>=10 && o.latch&&n(r=>r.mapped)===routes.length&&wetNum===routes.length &&
      n(r=>r.status==='shared'||r.status==='wrong-map'||r.status==='open')===0;
    const structurePass=!(o.fault==='rail'&&activeByN.has(o.target));
    const accepted=electricalPass && structurePass;
    const counts={active:routes.length,contactedPins:n(r=>r.directPads.length>0),reachable:n(r=>r.connected),unique:n(r=>r.unique),
      mapped:n(r=>r.mapped),wet:wetNum,empty:n(r=>r.status==='empty'),shared:n(r=>r.status==='shared'),
      open:n(r=>r.status==='open'),wrong:n(r=>r.status==='wrong-map')};
    return {options:o,stage,rows,contacts,bridgeNeighbor,counts,accepted,structurePass,electricalPass};
  }
  function cutPolyline(points,gapX,halfGap){
    const j=points.findIndex((p,i)=>i>0&&points[i-1][0]<=gapX-halfGap&&p[0]>=gapX+halfGap);
    if(j<0)return [points];
    const [ax,ay]=points[j-1],[bx,by]=points[j];
    const split=x=>[x,ay+(by-ay)*(x-ax)/(bx-ax)];
    return [[...points.slice(0,j),split(gapX-halfGap)],[split(gapX+halfGap),...points.slice(j)]];
  }
  function drawing(input={}){
    const o=calcOptions(input),routes=routesFor(o.population);
    const L={carrier:[],nickel:[],lower:[],gold:[],platinum:[],upper:[],fixture:[]};
    const add=(l,shape,g,more={})=>L[l].push({shape,...g,...more});
    const stroke=(l,pts,w,more)=>add(l,'stroke',{pts,w},more);
    const disc=(l,x,y,r,more)=>add(l,'circle',{x,y,r},more);
    const rect=(l,x,y,w,h,more)=>add(l,'rect',{x,y,w,h},more);
    for(const l of ['carrier','nickel'])rect(l,-1350,-1700,40500,3400,{id:l+'-crop'});
    const rails=[...new Map(routes.map(r=>[r.rail,r.yRail]))];
    const s0=444;
    for(const l of ['lower','upper']) {
      for(const [rail,y] of rails){
        const anchor=[[s0,y],[7100,y],[P.neckX,-20-(rail*2+.5)*P.stemPitch]];
        if(o.fault==='rail'&&Math.floor((o.target-1)/2)===rail){
          const pieces=cutPolyline(anchor,3640,26);
          pieces.forEach((path,i)=>stroke(l,path,P.railWidth,{id:l+'-rail-'+(rail+1)+'-'+(i+1),fault:'rail'}));
        }else{stroke(l,anchor,P.railWidth,{id:l+'-rail-'+(rail+1)});}
      }
      for(let i=0;i+1<rails.length;i++){
        const a=rails[i][1],b=rails[i+1][1];
        for(let j=0;j<11;j++){
          let x=650+j*566+((i%2)*43); const d=(a-b)*(i%2?1:-1);
          const relevant=routes.filter(r=>r.yRail===a||r.yRail===b);
          while(relevant.some(r=>dSeg(...r.site,[x,a],[x+d,b])<P.siteRadius+P.braceWidth/2+1))x+=12;
          stroke(l,[[x,a],[x+d,b]],P.braceWidth,{id:l+'-brace-'+i+'-'+j});
        }
      }
      rect(l,P.neckX-30,P.stemY-P.stemWidth/2,37200-(P.neckX-30),P.stemWidth,{id:l+'-stem'});
      for(const r of routes){
        const [sx,sy]=r.site,x=r.pad[0],tag={net:r.n};
        const hole=l==='upper'?Math.max(0,P.siteRadius-o.window):0;
        const branch=r.points[1],len=Math.hypot(branch[0]-sx,branch[1]-sy);
        const skip=hole?Math.min(.95,(hole+6.03)/len):0;
        const capStart=[sx+skip*(branch[0]-sx),sy+skip*(branch[1]-sy)];
        stroke(l,[capStart,branch],12,{id:l+'-landing-'+r.n,...tag});
        disc(l,sx,sy,14,{id:l+'-island-'+r.n,...tag,...(hole>0?{hole}: {})});
        stroke(l,[[x,r.leadY],[x,l==='lower'?P.padY0+16:P.padY0-11.02]],22,{id:l+'-riser-'+r.n,...tag});
        for(let j=-3;j<=3;j++) {
          const dx=j*54;
          if(l==='lower')stroke(l,[[x+dx,P.padY0+3],[x+dx,P.padY1]],34,{id:l+'-pad-strut-'+r.n+'-'+(j+4),...tag});
          if(l==='upper'){
            stroke(l,[[x+dx,P.padSeatY1+24],[x+dx,P.padSeatY1+65]],34,{id:l+'-pad-top-base-'+r.n+'-'+(j+4),...tag});
          }
        }
        if(l==='lower'){
          rect(l,x-206,P.padY0-6,412,P.padSeatY1-P.padY0+15,{id:l+'-pad-base-'+r.n,...tag});
          for(const y of [701,953])stroke(l,[[x-162,y],[x+162,y+21]],19,{id:l+'-internal-pad-brace-'+r.n+'-'+y,...tag});
        }
      }
      const left=routes[0].pad[0]-190,right=routes[routes.length-1].pad[0]+190;
      for(const x of [542,799,1029])stroke(l,[[left,x],[right,x]],l==='lower'?19:15,{id:l+'-pad-tie-'+x});
    }
    for(const r of routes){
      const n=r.n,x=r.pad[0],tag={net:n};
      const traced=o.fault==='open'&&o.target===n?cutPolyline(r.points,18350,30):[r.points];
      traced.forEach((pts,i)=>stroke('gold',pts,P.leadWidth,{id:'au-route-'+n+(i?'-'+i:''),...tag}));
      rect('gold',x-P.padWidth/2,P.padY0,P.padWidth,P.padSeatY1-P.padY0,{id:'au-seat-'+n,...tag});
      for(let j=-3;j<=3;j++)stroke('gold',[[x+j*54,P.padSeatY1-5],[x+j*54,P.padY1-7]],18,{id:'au-pad-finger-'+n+'-'+(j+4),...tag});
      for(const y of [701,953])stroke('gold',[[x-162,y],[x+162,y+21]],12,{id:'au-pad-inner-link-'+n+'-'+y,...tag});
      disc('platinum',r.site[0]+o.ptShift,r.site[1],P.siteRadius,{id:'pt-site-'+n,...tag});
    }
    if(o.fault==='bridge'){
      const a=routes.find(r=>r.n===o.target),b=routes.find(r=>r.n===o.target+1)||routes.find(r=>r.n===o.target-1);
      if(a&&b)stroke('gold',[[18470,a.leadY],[18470,b.leadY]],4,{id:'au-bridge-'+a.n+'-'+b.n,fault:'bridge'});
    }
    for(let n=1;n<=P.count;n++){
      const pinX=padX(n)+o.offset,pinY=P.pinCenterY+o.depth;
      rect('fixture',pinX-P.pinWidth/2,pinY-P.pinDepth/2,P.pinWidth,P.pinDepth,{id:'pin-'+n,pin:n});
    }
    return L;
  }
  function transfer(z,f){
    const a=1/P.zin,b=2*Math.PI*f*P.zinC,d=a*a+b*b;
    const zr=a/d,zi=-b/d,c=zr+z.re,e=zi+z.im,den=c*c+e*e;
    return {re:(zr*c+zi*e)/den,im:(zi*c-zr*e)/den};
  }
  function waveform(r,opt={}){
    if(!r?.wet)return [];
    const n=r.sites[0],f=120+13*n,z=impedance(r,f),G=transfer(z,f),rate=6000,count=192,phase=n*.09;
    const source=(i)=>Math.sin(2*Math.PI*f*i/rate+phase);
    const output=(i)=>G.re*source(i)+G.im*Math.cos(2*Math.PI*f*i/rate+phase);
    return Array.from({length:count},(_,i)=>({timeS:i/rate,inputUV:60*source(i),outputUV:60*output(i),site:n,hz:f}));
  }
  function sweep(r,frequency=1000){
    const f=new Set([...Array.from({length:37},(_,i)=> Math.round(10*10**(i/12))),+frequency]);
    return [...f].filter(x=>x>=10&&x<=10000).sort((a,b)=>a-b).map(freq=>({frequency:freq,...impedance(r,freq)})).filter(x=>Number.isFinite(x.abs));
  }
  const refLabel='Teaching ID map only; actual vendor pad order, mating PCB and acquisition permutation were not recovered. E## → A## → P## is this fixture’s baseline, not the original experiment’s file channel order.';
  root.MeshEngine={P,SOURCES,STAGES,MASKS,POPS,opt0,calcOptions,routesFor,analyze,drawing,impedance,sweep,waveform,overlapCircle,length,dSeg,CAL,refLabel,label,round};
})(typeof module==='object'&&module.exports?module.exports:globalThis);
