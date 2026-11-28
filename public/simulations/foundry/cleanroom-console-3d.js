/**
 * Educational in-world console, never a vendor HMI or evidence of process qualification.
 * +Y up, +Z front, units metres. Does not create a renderer or schedule animation.
 * update(record, p) only submits a texture when visible text/indicators change.
 */
const W=960,H=600;
const C={dark:'#102b2b',frame:'#173936',line:'#3c625c',cream:'#eff6e7',muted:'#accabd',
  mint:'#80d0b9',lime:'#d2e3a8',gold:'#f4cb86',alarm:'#f4a687',paper:'#d9e9de'};
const clean=v=>String(v??'').replace(/[\n\r\t]+/g,' ').replace(/\s+/g,' ').trim();
const progress=p=>Math.min(1,Math.max(0,Number.isFinite(+p)?+p:0));
const fmtIndex=(i)=>String(i+1).padStart(2,'0');

function orderedSettings(r){
  return (Array.isArray(r.settings)?r.settings:[])
    .filter(x=>Array.isArray(x)&&x.length>=2&&clean(x[0])&&clean(x[1]))
    .map(x=>[clean(x[0]),clean(x[1])]);
}
function family(r){
  if(r.fitLimit||r.nativeHold||r.blocked||r.fitStatus==='incompatible')return 'blocked';
  if(r.kind==='unknown'||r.stageStatus==='external'||r.coverage==='external')return 'external';
  if(r.nonphysical||r.workpieceShape==='none'||r.spec==='none')return 'digital';
  if(r.kind==='handoff')return 'handoff';
  if(r.kind==='test'||r.kind==='inspection'||r.effect==='measure')return 'review';
  if(r.effect==='handoff'||r.effect==='none')return 'handoff';
  return 'process';
}
const phasesByKind={
  process:['TRANSFER','LOAD','SETUP','MODEL RUN','VERIFY'],
  review:['TRANSFER','POSITION','SETUP','INSPECT','REVIEW'],
  handoff:['RECEIVE','STAGE','REVIEW','HOLD','HAND OFF'],
  digital:['OPEN RECORD','NO LOAD','REVIEW','COMPUTE','COMPARE'],
  blocked:['RECEIVE','FIT GATE','CHECK FIT','RUN BLOCKED','HOLD'],
  external:['BOUNDARY','NO LOAD','EVIDENCE','NO RUN','HAND OFF']
};
const publicStatus={
  process:'Illustrative controls only',
  review:'Inspection / readout only',
  handoff:'Handoff only; no local tool run',
  digital:'Digital record; no wafer or process run',
  blocked:'Fixture incompatible; no insertion or run',
  external:'External process; no local execution'
};
const stageIndex=p=>p<.16?0:p<.32?1:p<.57?2:p<.81?3:4;
const sans='system-ui, -apple-system, "Segoe UI", sans-serif';
const mono='ui-monospace, "SFMono-Regular", Consolas, monospace';
const circle=(ctx,x,y,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
function ellipsis(ctx,str,w){
  if(ctx.measureText(str).width<=w)return str;
  let low=0,hi=str.length;
  while(low<hi){const m=(low+hi+1)>>1;if(ctx.measureText(str.slice(0,m)+'…').width<=w)low=m;else hi=m-1;}
  return str.slice(0,low).trimEnd()+'…';
}
function block(ctx,str,x,y,w,size,leading,lines=3){
  ctx.font='650 '+size+'px '+sans;
  const words=str.split(' ');let buf='',row=0;
  for(let i=0;i<words.length;i++){
    const trial=buf?buf+' '+words[i]:words[i];
    if(ctx.measureText(trial).width<=w){buf=trial;continue;}
    if(!buf){buf=ellipsis(ctx,words[i],w);continue;}
    if(row>=lines-1){ctx.fillText(ellipsis(ctx,buf+' '+words.slice(i).join(' '),w),x,y+row*leading);return row+1;}
    ctx.fillText(ellipsis(ctx,buf,w),x,y+row++*leading);buf=words[i];
  }
  if(buf&&row<lines){ctx.fillText(ellipsis(ctx,buf,w),x,y+row++*leading);}
  return row;
}
function makeCanvas(){
  try{
    let canvas;
    if(typeof document!=='undefined'&&document.createElement)canvas=document.createElement('canvas');
    else if(typeof OffscreenCanvas!=='undefined')canvas=new OffscreenCanvas(W,H);
    if(!canvas)return null;
    canvas.width=W;canvas.height=H;
    const c=canvas.getContext('2d',{alpha:false});
    return c?{canvas,ctx:c}:null;
  }catch{return null;}
}
function paint(ctx,v){
  const {type,phase,selected,title,rows,operation,fitLimit,evidence,assetId}=v;
  const state=phasesByKind[type][phase],stopped=type==='blocked'||type==='external';
  const accent=stopped?C.alarm:phase===2?C.gold:C.mint;
  ctx.fillStyle=C.dark;ctx.fillRect(0,0,W,H);
  ctx.textBaseline='alphabetic';ctx.textAlign='left';
  const label=(text,x,y,font,color,max)=>{
    ctx.font=font;ctx.fillStyle=color;
    ctx.fillText(max?ellipsis(ctx,text,max):text,x,y);
  };
  // Screen header: stable plate identity and station role.
  ctx.fillStyle=C.frame;ctx.fillRect(0,0,W,79);
  ctx.fillStyle=accent;ctx.fillRect(0,0,10,79);
  label('FOUNDRY / VIRTUAL CONSOLE',32,32,'700 20px '+mono,C.mint);
  label(title,32,64,'720 26px '+sans,C.cream,685);
  const badge=assetId?'REG '+assetId:'TEACHING BAY';
  ctx.fillStyle='#294944';ctx.fillRect(737,22,194,40);
  label(badge,751,48,'650 19px '+mono,C.paper,163);
  // Program timeline; badges use discrete, legible changes, not rapid flashing.
  const labels=phasesByKind[type],startX=32,gap=7,stepW=174;
  for(let i=0;i<labels.length;i++){
    const x=startX+i*(stepW+gap),active=i===phase;
    ctx.fillStyle=active?accent:i<phase?'#31534a':'#1e3a36';
    ctx.fillRect(x,99,stepW,42);
    label(labels[i],x+10,126,'720 '+(labels[i].length>9?'16':'18')+'px '+mono,active?C.dark:i<phase?C.paper:C.muted,stepW-19);
  }
  // The virtual console is not a recipe database. It displays the traveler
  // verbatim except for typographic wrapping; omitted source details stay omitted.
  const cursor=rows.length?Math.max(0,Math.min(rows.length-1,selected)):0;
  const field=rows[cursor]||['Setup record','No operator settings are specified for this station.'];
  const seq=rows.length?fmtIndex(cursor)+' / '+String(rows.length).padStart(2,'0'):'—';
  const fieldAction=stopped?'EVIDENCE FIELD':type==='digital'||type==='review'||type==='handoff'?'REVIEW FIELD':'SETUP FIELD';
  label(fieldAction+'   '+seq,32,182,'720 21px '+mono,accent,520);
  // The main value is large enough to read on a close-up; it never shows a zero
  // where a process setting is absent. No slider animates an invented setpoint.
  ctx.fillStyle='#1a3936';ctx.fillRect(32,203,896,200);
  ctx.fillStyle=accent;ctx.fillRect(32,203,5,200);
  label(field[0],54,246,'710 31px '+sans,C.cream,851);
  ctx.fillStyle=C.paper;
  block(ctx,field[1],54,300,848,34,39,3);
  // Cursor count updates only at a field boundary during SETUP; the track
  // remains a count of reviewed entries, not a process completion percentage.
  const reviewed=phase<2?0:phase===2?cursor+1:rows.length;
  const ww=437;
  ctx.fillStyle='#284641';ctx.fillRect(36,424,ww,7);
  ctx.fillStyle=accent;ctx.fillRect(36,424,rows.length?ww*reviewed/rows.length:0,7);
  label(rows.length?'FIELDS  '+reviewed+' OF '+rows.length:'NO FIELDS SUPPLIED',36,461,'650 19px '+mono,C.muted,ww);
  const flag=stopped?'ACTION HELD':phase===2?(type==='process'?'STAGING INPUT':'REVIEWING'):(phase===3?state:'TRAVELER');
  circle(ctx,681,443,6,accent);
  label(flag,698,450,'710 20px '+mono,C.paper,226);
  ctx.fillStyle=C.frame;ctx.fillRect(0,482,W,118);
  label(publicStatus[type],32,514,'720 23px '+sans,accent,888);
  const qual=type==='blocked'?(fitLimit||'Verify the workpiece/fixture fit before any local process.'):evidence||operation;
  label(qual,32,549,'500 23px '+sans,C.paper,890);
  label('TEACHING DISPLAY  /  NOT A VENDOR RECIPE OR COMMAND INTERFACE',32,582,'620 18px '+mono,C.muted,892);
}

export function makeSetupConsole(THREE){
  const T=THREE;
  const group=new T.Group();group.name='Virtual traveler / operator console';group.userData.role='setup-console';
  const ownedMats=new Set(),ownedGeom=new Set();
  const standard=(name,c,r=.65,m=.18)=>{
    const a=new T.MeshStandardMaterial({color:c,roughness:r,metalness:m});a.name=name;ownedMats.add(a);return a;
  };
  const basic=(name,params)=>{const a=new T.MeshBasicMaterial({...params,toneMapped:false});a.name=name;ownedMats.add(a);return a;};
  const metal=standard('Brushed steel support',0x849995,.49,.63),caseMat=standard('Warm powder-coated enclosure',0xc4d3c5,.67,.2),
    bezel=standard('Graphite monitor bezel',0x243332,.67,.12),rubber=standard('Dark polymer feet / keys',0x1b2728,.84,.02),
    edge=standard('Dark edge trim',0x435955,.57,.24),keyMat=standard('Polymer keypad',0x839a91,.74,.03),
    amber=standard('Warm indicator lens',0xd5a260,.44,.20),light=basic('Activity tell-tale',{color:0x85d4bc});
  function geom(g){ownedGeom.add(g);return g;}
  const cube=geom(new T.BoxGeometry(1,1,1)), disk=geom(new T.CylinderGeometry(.5,.5,1,12,1));
  const put=(parent,name,g,m,x,y,z)=>{const n=new T.Mesh(g,m);n.name=name;n.position.set(x,y,z);parent.add(n);return n;};
  const box=(o,n,m,w,h,d,x,y,z)=>{const object=put(o,n,cube,m,x,y,z);object.scale.set(w,h,d);return object;};
  const cyl=(o,n,m,diam,h,x,y,z,face=false)=>{const object=put(o,n,disk,m,x,y,z);object.scale.set(diam,h,diam);if(face)object.rotation.x=Math.PI/2;return object;};
  box(group,'Weighted plinth',caseMat,.406,.036,.333,0,.029,-.012);
  box(group,'Plinth toe',rubber,.374,.011,.308,0,.0055,-.012);
  box(group,'Plinth crown',metal,.313,.014,.188,0,.054,-.044);
  box(group,'Freestanding column',metal,.102,.826,.075,0,.471,-.059);
  box(group,'Service channel',edge,.064,.749,.015,0,.47,-.101);
  box(group,'Recessed column stripe',rubber,.028,.729,.004,0,.476,-.018);
  box(group,'Tilt joint',edge,.198,.061,.067,0,.953,-.033);
  cyl(group,'Joint end disc',metal,.064,.133,0,.947,-.031).rotation.z=Math.PI/2;
  box(group,'Tilt joint bracket',metal,.083,.152,.039,0,.959,-.033);
  const face=new T.Group();face.name='Console head';face.rotation.x=-.12;face.position.set(0,1.082,0);group.add(face);
  box(face,'Rear shell',caseMat,.505,.365,.056,0,-.008,-.041);
  box(face,'Bezel surround',bezel,.499,.354,.028,0,-.005,-.005);
  box(face,'Polished screen lip',edge,.472,.294,.013,0,.016,.012);
  const panel=makeCanvas();
  let texture=null,screenMaterial;
  if(panel){
    texture=new T.CanvasTexture(panel.canvas);
    texture.name='Virtual stage evidence / console readout';
    texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;
    texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=2;
    screenMaterial=basic('Educational readout surface',{map:texture});
  }else{
    screenMaterial=basic('Inactive local console (no canvas available)',{color:0x203d37});
  }
  const readout=put(face,'Simulation-only readout',geom(new T.PlaneGeometry(.463,.2894)),screenMaterial,0,.015,.020);
  readout.userData.role='setup-screen';
  // Separate physical controls: local teaching model, no vendor branding.
  box(face,'Tactile control rail',caseMat,.479,.040,.015,0,-.151,.009);
  for(let i=0;i<3;i++)box(face,'Review softkey '+(i+1),keyMat,.034,.014,.009,-.139+i*.044,-.15,.022);
  cyl(face,'Virtual position lamp',light,.012,.006,-.204,-.15,.021,true);
  for(let i=0;i<2;i++)box(face,'Sealed function switch '+i,bezel,.023,.013,.009,.043+i*.033,-.15,.022);
  cyl(face,'Review wheel body',bezel,.037,.016,.174,-.15,.027,true);
  cyl(face,'Review wheel cap',metal,.028,.005,.174,-.15,.036,true);
  box(face,'Wheel index mark',amber,.003,.010,.002,.174,-.141,.039);
  for(const x of [-.237,.237])for(const y of [-.170,.160])cyl(face,'Flush captive screw',metal,.006,.002,x,y,.010,true);
  for(const x of [-.17,-.12,-.07,0,.07,.12,.17])box(face,'Rear cooling slot',edge,.027,.005,.002,x,.11,-.070);
  const target=new T.Vector3(0,1.094,.02);
  group.userData.screenTarget=target.toArray();
  let previous=null,prepared=null,recordKey='',lastKey='',phaseCache=-1,fieldCache=-1,disposed=false;
  const offColor=0x6b877b,liveColor=0x93e1c6,setupColor=0xefc17a,holdColor=0xd98568;
  function makeView(r){
    return {title:clean(r.machine||r.model?.title||r.stationLabel||'Teaching station'),
      operation:clean(r.operation),rows:orderedSettings(r),type:family(r),
      fitLimit:clean(r.fitLimit),evidence:clean(r.evidence),
      assetId:clean(r.equipmentId||r.model?.id)};
  }
  function update(record={},p=0){
    if(disposed)return;
    const r=record||{},u=progress(p),phase=stageIndex(u);
    const changed=r!==previous;
    if(changed){prepared=makeView(r);previous=r;recordKey=JSON.stringify(prepared);}
    const base=prepared,n=base.rows.length;
    const selected=n?(phase<2?0:phase>2?n-1:Math.min(n-1,Math.floor((u-.32)/.25*n))):0;
    if(phase===phaseCache&&selected===fieldCache&&(!changed||recordKey===lastKey))return;
    const v={...base,phase,selected};
    // String content is serialized only when a new record is supplied. At 60Hz,
    // unchanged phase/field means no Canvas2D call and no texture upload.
    lastKey=recordKey;phaseCache=phase;fieldCache=selected;
    const hold=v.type==='blocked'||v.type==='external';
    group.userData.phase=phasesByKind[v.type][phase];
    group.userData.activeField=n?selected:null;
    group.userData.noLocalRun=hold||v.type==='digital'||v.type==='handoff'||v.type==='review';
    group.userData.paintCount=(group.userData.paintCount||0)+1;
    light.color.setHex(hold?holdColor:phase===2?setupColor:phase===3?liveColor:offColor);
    if(panel){paint(panel.ctx,v);texture.needsUpdate=true;}
  }
  function dispose(){
    if(disposed)return;disposed=true;
    group.removeFromParent();texture?.dispose();
    for(const a of ownedGeom)a.dispose();for(const a of ownedMats)a.dispose();
    if(panel){panel.canvas.width=1;panel.canvas.height=1;}
    previous=null;prepared=null;group.clear();
  }
  update({kind:'unknown',machine:'Virtual console',settings:[]},0);
  return {group,update,dispose,screenTarget:target};
}
