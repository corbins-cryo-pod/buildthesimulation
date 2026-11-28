/* Build The Simulation — transparent graphite/graphene process comparison. */
(function(root){
'use strict';
const SOURCE={
  clear:{title:'Park, Schendel, Mikael et al. (2014) · Nature Communications 5:5258',url:'https://www.nature.com/articles/ncomms6258',doi:'10.1038/ncomms6258',scope:'Fig. 1 and Methods: carrier, 16-site released CLEAR arrays and sequential transfer/encapsulation. Fig. 2e–f: sheet resistance and optical witness. Supplement S5: sequence of fabrication.'},
  delft:{title:'Alvarez de Eulate, Pavlou, León González et al. (2026) · Advanced Science 13:e17524',url:'https://advanced.onlinelibrary.wiley.com/doi/10.1002/advs.202517524',doi:'10.1002/advs.202517524',scope:'§2.1, Fig. 1 and §4.1/Supplement S2: fused-silica Mo-on-chip growth, cap/passivation, dicing, local catalyst removal and assembly. Fig. 2a–b and §4.2: Raman and separate material transmission witness.'}
};
const PRESETS={
  clear:{tear:'none',transferPath:'terminal',windowShift:0},
  delft:{inner:'intact',moAtFace:0,diameter:10,windowShift:0}
};
const SAMPLE={
  clear:{id:'CL-04',short:'CLEAR',name:'Four transfers on a flexible film',sub:'Parylene-C • silicon removed',catalog:'68-clear-transparent-graphene-microecog',
    dimensionEvidence:'The displayed 100 µm contact and one-path layout are a teaching coupon, not sourced CLEAR mask dimensions. The source device patterns 16 sites.',
    bands:'470 and 570 nm',
    evidence:[
      {label:'Fabrication record',main:'Four sequential transfers',desc:'Four donor monolayers were stacked on the parylene/metal stack. That is an operation count, not a local layer-count measurement at every site.'},
      {label:'Sheet resistance',main:'152 → 76 Ω/□',desc:'Fig. 2e compares a one-layer material witness (152 Ω/□) with a four-layer material witness (76 Ω/□); neither number is a complete site-to-pad reading.'},
      {label:'Transmission witness',main:'≈90%',desc:'Fig. 2f plus text: four graphene layers on a 15 µm parylene-C witness at two highlighted visible bands (470 and 570 nm). This is not a 550 nm site datum or a spectrum of your simulated coupon.'}
    ],
    stages:[
      ['Prepare temporary silicon','Start on an incoming silicon support. The electronic coupon is released later; the Si is not part of the final optical path.',['01-01','02-12']],
      ['Deposit lower parylene','The paper reports 15 µm of parylene-C on the silicon support. Keep it as the flexible base.',['03-08']],
      ['Pattern Cr/Au pads and leads','Define 10 nm Cr and 200 nm Au to form the metal terminals and the start of each routing path. The contact face itself will be graphene.',['02-01','03-01','04-06']],
      ['Transfer sheet 1','Bring the first separately grown CVD monolayer onto the prepared surface. An operator logs a transfer; that does not prove continuity.',['04-06'],'Donor graphene and qualified transfer'],
      ['Transfer sheet 2','Stack a second donor sheet. It can be continuous where the first has a tear, but one extra transfer does not establish local electronic bridging.',['04-06'],'Donor graphene and qualified transfer'],
      ['Transfer sheet 3','Stack a third donor sheet and preserve the prior order. The simulator does not treat one observed optical value as a direct count of three layers.',['04-06'],'Donor graphene and qualified transfer'],
      ['Transfer sheet 4','The target stack now has four logged transfers. Keep this fabrication log distinct from the electrical and optical material witnesses.',['04-06'],'Donor graphene and qualified transfer'],
      ['Add protective oxide; pattern carbon','The published process uses a temporary 30 nm SiO₂ coating during pattern transfer. Define the electrode and accumulated carbon routes; this coupon shows a single branch.',['02-01','04-01'],'Protective-oxide deposition qualification'],
      ['Apply passivation; cut windows','Deposit the reported 10 µm upper parylene and define site and pad windows plus the outline. The opened site still has its temporary oxide.',['03-08','02-01','04-01']],
      ['Release parylene from silicon','The flexible laminate separates from the carrier. The reference optical film is not a test of the assembly when it is still on opaque silicon.',['04-06','12-01']],
      ['Clear the protective oxide','Remove the sacrificial oxide after release to open the carbon contact. The upper passivation over leads remains.',['04-06','12-01']],
      ['Fit the tail; audit the coupon','Represent the reported polyimide stiffener and connector as a bench interface. Compare continuity and exposed area against the independent source witnesses.',['05-06','05-07','05-10','16-13'],'Calibrated transmission measurement']
    ]},
  delft:{id:'DL-ML',short:'Delft',name:'Direct growth on rigid silica',sub:'Fused silica • substrate retained',catalog:'209-tu-delft-transfer-free-multilayer-graphene-mea',
    dimensionEvidence:'The paper reports 10, 30 and 50 µm contact variants on several arrays. Here they are single-contact coupons; no full masks or source pinout are recovered.',
    bands:'550 nm',
    evidence:[
      {label:'Raman witness',main:'D ≈1335 · G ≈1582 · 2D ≈2660 cm⁻¹',desc:'The paper compares averaged spectra (n=5) after growth and after device fabrication; it reports I₂D/I_G < 1 and an as-grown I_D/I_G of ~0.35. These observations support multilayer material and are not a direct layer count.'},
      {label:'Thickness inference',main:'Roughly 20–25 layers',desc:'A 52.5 percentage-point optical loss divided by a nominal 2.3 percentage points per layer gives 22.8. This linear estimate becomes less reliable for thick stacks and is not a per-site count.'},
      {label:'Transmission witness',main:'47.5% at 550 nm',desc:'Fig. 2b uses a separate, centimeter-scale graphene sheet transferred to glass for the optical test and subtracts the glass contribution. The actual device process grows directly on patterned Mo without a graphene transfer.'}
    ],
    stages:[
      ['Accept fused silica','Start on a transparent fused-silica carrier that remains in the finished coupon. It is not a flexible foil.',['01-01','02-12']],
      ['Pattern Mo catalyst and back marker','The process sputters 50 nm Mo on the front, then transfers the catalyst pattern by ICP-RIE. A temporary backside Ti marker aids tool detection; it is not conductivity through the front.',['03-03','02-01','04-02']],
      ['Remove the back marker','The temporary marker is removed before growth to avoid introducing it into the growth stack. Keep patterned Mo; do not remove the growth template.',['04-06']],
      ['Grow multilayer carbon on Mo','The patterned Mo is the growth template for a turbostratic multilayer carbon film. No donor-sheet transfer occurs on the device. Import this as an external growth step, not generic dielectric PECVD.',['05-10'],'Qualified high-temperature catalytic graphene CVD'],
      ['Protect the contact with Ti/Al','The reported pattern uses a lifted-off 10 nm Ti / 100 nm Al cap over future electrodes. Prevent damage at the contact; this cap is sacrificial.',['02-01','03-01','04-06']],
      ['Make outer Au routing; add clamp layer','Pattern the outer Ti/Au tracks and contact pads. A new backside Ti clamp layer is used for a later plasma tool; it is separate from the removed marker.',['03-01','02-01']],
      ['Deposit parylene passivation','Add the reported 1–2 µm parylene-C layer over the metal and carbon tracks. Keep inner graphene/Mo separate from outer Ti/Au.',['03-08']],
      ['Etch pad and contact openings','Define pad and contact access in the passivation. The contact opening lands on the sacrificial cap, not on exposed graphene.',['02-01','04-02']],
      ['Dice and retain the glass','The die separates from the wafer perimeter by dicing. Its fused silica remains under the electronic stack. Dicing is not film release.',['04-07']],
      ['Clear cap and back clamp layer','Remove the two temporary metals where specified. Mo still underlies the graphene at this moment; seeing dark carbon is not proof of a Mo-free aperture.',['04-06','12-01']],
      ['Clear Mo only at the site','Remove Mo beneath the opened graphene face; the covered inner wire intentionally retains its graphene/Mo bilayer. Residual catalyst can remain in a virtual fault.',['04-06','12-01']],
      ['Connect to PCB; audit the coupon','Represent the wired PCB interface and assess continuity, aperture and witness provenance separately. The Raman and optical coupons are not equivalents of a local film-thickness check.',['08-02','05-07','05-10'],'Calibrated normal-transmission measurement']
    ]}
};
const clamps=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
function options(key,incoming={}){
  const n=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
  const windowShift=clamps(n(incoming.windowShift,0),0,2);
  if(key==='clear')return {tear:['none','one','aligned','staggered'].includes(incoming.tear)?incoming.tear:'none',
    transferPath:incoming.transferPath==='ideal'?'ideal':'terminal',windowShift};
  return {inner:['intact','carbon-break','both-break','mo-open'].includes(incoming.inner)?incoming.inner:'intact',
    moAtFace:clamps(n(incoming.moAtFace,0),0,1),diameter:[10,30,50].includes(+incoming.diameter)?+incoming.diameter:10,windowShift};
}
const dims=(key,o)=>{
  if(key==='clear')return {diameter:100,plateW:900,plateH:420,siteX:168,siteY:210,routeX1:168,routeX2:720,overlap:28,routeW:38};
  return {diameter:o.diameter,plateW:900,plateH:420,siteX:168,siteY:210,routeX1:168+o.diameter/2,routeX2:720,overlap:20,routeW:12};
};
function circleOverlap(a,b,d) {
  if(a===0||b===0||d>=a+b)return 0;
  if(d<=Math.abs(a-b))return Math.PI*Math.min(a,b)**2;
  return a*a*Math.acos(clamps((d*d+a*a-b*b)/(2*d*a),-1,1))+b*b*Math.acos(clamps((d*d+b*b-a*a)/(2*d*b),-1,1))-
    .5*Math.sqrt(Math.max(0,(-d+a+b)*(d+a-b)*(d-a+b)*(d+a+b)));
}
// Effective resistance from a one-volt nodal solve. Wires with no route to either endpoint are dropped.
function solve(edges,from='a',to='b'){
  const g=new Map(), connect=(a,b,r)=>{if(!g.has(a))g.set(a,[]);g.get(a).push([b,1/r]);};
  edges.forEach(([a,b,r])=>{if(a!==b&&r>0&&Number.isFinite(r)){connect(a,b,r);connect(b,a,r);}});
  const reachable=new Set([from]),todos=[from];while(todos.length){
    for(const [y] of g.get(todos.pop())||[])if(!reachable.has(y)){reachable.add(y);todos.push(y);}
  }
  if(!reachable.has(to))return null;
  const int=[...reachable].filter(x=>x!==from&&x!==to),p=new Map(int.map((x,i)=>[x,i])),n=int.length;
  const A=int.map((node,i)=>{
    const r=Array(n+1).fill(0);
    for(const [neighbor,c] of g.get(node)){
      r[i]+=c;
      if(neighbor===from)r[n]+=c;
      else if(neighbor!==to)r[p.get(neighbor)]-=c;
    }
    return r;
  });
  for(let i=0;i<n;i++){
    let row=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[row][i]))row=j;
    if(Math.abs(A[row][i])<1e-15)return null;
    [A[i],A[row]]=[A[row],A[i]];let pivot=A[i][i];
    for(let k=i;k<=n;k++)A[i][k]/=pivot;
    for(let j=0;j<n;j++)if(j!==i){const x=A[j][i];for(let k=i;k<=n;k++)A[j][k]-=x*A[i][k];}
  }
  const volts=y=>y===from?1:y===to?0:A[p.get(y)][n]; 
  const out=(g.get(from)||[]).reduce((sum,[y,c])=>sum+c*(1-volts(y)),0);
  return out>1e-12?1/out:null;
}
const interpolatedRs=n=> n>0?152/Math.sqrt(n):null;
const grownEstimate=(100-47.5)/2.3;
const layerCuts=(setting,sheet,n)=>{
  if(setting==='one'&&sheet===n-1)return [2];
  if(setting==='aligned')return [2];
  if(setting==='staggered')return [sheet%4];
  return [];
};
function clearFilm(n,opt,dimensions){
  if(n<1)return {rOhm:null,fullSheets:0,edges:[],rsEquivalent:null,segDefects:[]};
  const L=dimensions.routeX2-dimensions.routeX1,W=dimensions.routeW,q=interpolatedRs(n)*n*L/W/4;
  const edges=[],segDefects=[];let full=0; 
  for(let sheet=0;sheet<n;sheet++){
    const cuts=layerCuts(opt.tear,sheet,n);
    const v=i=>i===0?'a':i===4?'b':opt.transferPath==='ideal'?'ideal_'+i:'s'+sheet+'_'+i;
    for(let i=0;i<4;i++){
      if(!cuts.includes(i))edges.push([v(i),v(i+1),q]);
      else segDefects.push([sheet+1,i]);
    }
    if(!cuts.length)full++;
  }
  const rOhm=solve(edges);return {rOhm,fullSheets:full,edges,rsEquivalent:rOhm===null?null:rOhm*W/L,segDefects};
}
function delftFilm(opt,d){
  const L=d.routeX2-d.routeX1,W=d.routeW;
  // Fictional dry sheet resistances used solely to demonstrate an alternate path.
  const p=120*L/W, m=1.06*L/W, end=120*(.5*d.diameter+20)/W+.45;
  const carbon=!['carbon-break','both-break'].includes(opt.inner), moly=!['mo-open','both-break'].includes(opt.inner);
  const ed=[['j','b',end]];
  if(carbon)ed.push(['a','j',p]); if(moly)ed.push(['a','j',m]);
  return {rOhm:solve(ed),carbon,moly,edges:ed,assumed:{carbonSheet:120,molySheet:1.06,end}};
}
function model(key,step,state={}){
  if(!(key in SAMPLE))throw new Error('Unknown reference');
  const s=clamps(Math.round(Number(step)||0),0,11),o=options(key,state),d=dims(key,o);
  const isC=key==='clear', n=isC?clamps(s-2,0,4):0;
  const film=isC?clearFilm(n,o,d):delftFilm(o,d);
  const art=s>=(isC?7:5);
  const apertureFormed=s>=(isC?8:7);
  const hasCarbon=isC?n>0:s>=3;
  const backed=isC?s<9:true;
  const cap=isC?(s>=7&&s<10):(s>=4&&s<9);
  const residue=isC?0:s<1?0:s<10?1:o.moAtFace;
  const r=d.diameter/2, windowDx=o.windowShift*r, nominalA=Math.PI*r*r;
  const geom=apertureFormed?circleOverlap(r,r,windowDx):0;
  const capBlocked=cap||!hasCarbon;
  const carbonArea=capBlocked?0:geom*(1-residue);
  const clearFraction=carbonArea/nominalA, ready=s===11;
  const dry=art?film.rOhm:null, pass=ready&&dry!==null&&clearFraction>=.999&&(isC?n===4:true);
  const note=residue>0&&!isC?'Mo remains in this modeled portion of the face. A conducting trace does not prove the catalyst was cleared.':
    cap?'The polymers may have a window, but the temporary cap has not been cleared.':
      apertureFormed&&geom<.999*nominalA?'Window misregistration reduces the exposed/optically unblocked area; adding a conducting layer cannot realign it.':'';
  return {sample:SAMPLE[key].id,key,s,o,d,n,film,hasCarbon,backed,cap,residue,windowDx,nominalA,geom,carbonArea,clearFraction,art,apertureFormed,dry,ready,pass,note};
}
root.GrapheneEngine={SOURCE,SAMPLE,PRESETS,options,model,dims,solve,circleOverlap,interpolatedRs,grownEstimate,clearFilm,delftFilm};
})(typeof module==='object'&&module.exports?module.exports:globalThis);
