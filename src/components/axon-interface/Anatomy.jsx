import {useEffect,useRef,useState} from 'preact/hooks';
import {centralValues} from './presentation.mjs';

const PALETTE={silent:'#6c8792',lost:'#8bbda5',persists:'#d8a65d',appears:'#c881a7',selected:'#f4ead6'};
export function cellColor(result,channel,i){
 const a=result?.matrices.assigned[channel]?.[i],b=result?.matrices.localSilenced[channel]?.[i];
 return a?(b?PALETTE.persists:PALETTE.lost):b?PALETTE.appears:PALETTE.silent;
}
export function voltageColor(value){
 if(!Number.isFinite(value))return PALETTE.silent;
 const a=[57,100,122],b=[233,208,137],c=[190,77,60],q=Math.max(0,Math.min(1,(value+100)/160)),lo=q<.625?a:b,hi=q<.625?b:c,t=q<.625?q/.625:(q-.625)/.375;
 return 'rgb('+lo.map((v,i)=>Math.round(v+(hi[i]-v)*t)).join(',')+')';
}
function shownColor(result,channel,i,colorMode,frame){
 if(colorMode!=='voltage'||!result)return cellColor(result,channel,i);
 const trace=result.pairTraces.find(p=>p.channel===channel&&p.cell===i)?.assigned;
 return voltageColor(centralValues(result,trace)[frame]);
}
function segmentsFor(cell,half,bipolar){
 if(!bipolar)return [{cell:cell.index,from:-half,to:half,diameter:cell.fiberDiameterUm}];
 const r=cell.somaDiameterUm/2,left=-Math.sqrt(r*r-(cell.peripheralStemDiameterUm/2)**2),right=Math.sqrt(r*r-(cell.centralStemDiameterUm/2)**2);
 return [
  {cell:cell.index,from:-half,to:left-cell.peripheralStemLengthUm,diameter:cell.peripheralFiberDiameterUm},
  {cell:cell.index,from:left-cell.peripheralStemLengthUm,to:left,diameter:cell.peripheralStemDiameterUm},
  {cell:cell.index,from:right,to:right+cell.centralStemLengthUm,diameter:cell.centralStemDiameterUm},
  {cell:cell.index,from:right+cell.centralStemLengthUm,to:half,diameter:cell.centralFiberDiameterUm}
 ];
}
export default function Anatomy({geometry,result,channel=0,selected=0,onSelect,view='oblique',frame=0,colorMode='recruitment'}){
 const mount=useRef(null),latest=useRef(null),[fallback,setFallback]=useState(false),[scale,setScale]=useState({width:80,um:100}),[reason,setReason]=useState('');
 latest.current={result,channel,selected,colorMode,frame,onSelect};
 const bipolar=Boolean(geometry.wells?.length);
 useEffect(()=>{
  let stopped=false,cleanup=()=>{};
  const host=mount.current;if(!host||fallback)return;
  Promise.all([import('three'),import('three/examples/jsm/controls/OrbitControls.js')]).then(([T,{OrbitControls}])=>{
   if(stopped)return;
   let renderer;
   try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}
   catch(e){setReason(e.message||'WebGL unavailable');setFallback(true);return;}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0x202a2d,1);host.append(renderer.domElement);
   const scene=new T.Scene(),r=geometry.fascicleRadiusUm,half=1200,aspect=host.clientWidth/host.clientHeight;
   const camera=new T.OrthographicCamera(-650*aspect,650*aspect,650,-650,1,20000);
   camera.position.set(...(view==='cross'?[0,0,4000]:view==='longitudinal'?[4000,0,100]:[1000,750,1700]));camera.lookAt(0,0,100);
   const controls=new OrbitControls(camera,renderer.domElement);
   controls.target.set(0,0,100);controls.enableDamping=true;controls.dampingFactor=.1;controls.minZoom=.25;controls.maxZoom=80;
   scene.add(new T.AmbientLight(0xffffff,2.3));
   const light=new T.DirectionalLight(0xffecd2,3);light.position.set(800,800,1500);scene.add(light);
   const dispose=[],sources=[];
   const mat=(color,opacity=1)=>{
    const m=new T.MeshStandardMaterial({color,roughness:.65,metalness:.1,transparent:opacity<1,opacity,depthWrite:opacity===1,side:T.DoubleSide});
    dispose.push(m);return m;
   };
   function cylinder(radius,length,material){
    const g=new T.CylinderGeometry(radius,radius,length,64,1,true);g.rotateX(Math.PI/2);dispose.push(g);
    scene.add(new T.Mesh(g,material));
   }
   cylinder(geometry.perineuriumOuterUm,half*2,mat('#b9a885',.085));cylinder(r,half*2,mat('#b8c7bc',.035));
   const ringMaterial=new T.LineBasicMaterial({color:'#b9a885',transparent:true,opacity:.75});dispose.push(ringMaterial);
   for(const z of [-half,0,half]){
    const pts=Array.from({length:97},(_,i)=>new T.Vector3(Math.cos(i/96*2*Math.PI)*geometry.perineuriumOuterUm,Math.sin(i/96*2*Math.PI)*geometry.perineuriumOuterUm,z));
    const g=new T.BufferGeometry().setFromPoints(pts);dispose.push(g);scene.add(new T.Line(g,ringMaterial));
   }
   const tubeGeom=new T.CylinderGeometry(1,1,1,8);tubeGeom.rotateX(Math.PI/2);dispose.push(tubeGeom);
   const segments=geometry.cells.flatMap(c=>segmentsFor(c,half,bipolar));
   const fibers=new T.InstancedMesh(tubeGeom,mat('#ffffff',.74),segments.length),obj=new T.Object3D(),color=new T.Color();
   segments.forEach((seg,i)=>{
    const c=geometry.cells[seg.cell];obj.position.set(c.xUm,c.yUm,(seg.from+seg.to)/2);obj.scale.set(seg.diameter/2,seg.diameter/2,seg.to-seg.from);obj.updateMatrix();
    fibers.setMatrixAt(i,obj.matrix);fibers.setColorAt(i,color.set(PALETTE.silent));
   });scene.add(fibers);
   const somaGeometry=new T.SphereGeometry(1,16,12);dispose.push(somaGeometry);
   const somas=new T.InstancedMesh(somaGeometry,mat('#ffffff'),geometry.cells.length);
   geometry.cells.forEach((c,i)=>{
    const d=c.somaDiameterUm||c.fiberDiameterUm;obj.position.set(c.xUm,c.yUm,0);obj.scale.setScalar(d*(bipolar ? .5 : 1));obj.updateMatrix();
    somas.setMatrixAt(i,obj.matrix);somas.setColorAt(i,color.set(PALETTE.silent));
   });scene.add(somas);
   if(bipolar){
    const w=geometry.wells[0],outer=w.innerRadiusUm+w.wallThicknessUm;
    function annulus(inner,outer,depth){
     const shape=new T.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);
     const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
     const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:24,steps:1});g.translate(0,0,-depth/2);dispose.push(g);return g;
    }
    const walls=new T.InstancedMesh(annulus(w.innerRadiusUm,outer,2*w.halfLengthUm),mat('#9aa3a5',.17),geometry.wells.length);
    const caps=new T.InstancedMesh(annulus(w.apertureRadiusUm,outer,w.wallThicknessUm),mat('#adb4ad',.3),2*geometry.wells.length);
    geometry.wells.forEach((well,i)=>{
     obj.scale.set(1,1,1);obj.position.set(...well.center);obj.updateMatrix();walls.setMatrixAt(i,obj.matrix);
     for(const [j,sign]of [[0,-1],[1,1]]){obj.position.set(well.center[0],well.center[1],sign*(well.halfLengthUm-well.wallThicknessUm/2));obj.updateMatrix();caps.setMatrixAt(2*i+j,obj.matrix);}
    });scene.add(walls);scene.add(caps);
    for(const ch of geometry.channels){
     const well=geometry.wells.find(x=>x.id===ch.wellId),angle=Math.asin(well.contactHalfWidthUm/well.innerRadiusUm);
     for(const [role,col]of [['source','#d8aa64'],['return','#b6c5c9']]){
      const points=[],indices=[],z0=ch[role][2];
      for(let k=0;k<=8;k++)for(const sign of [-1,1]){
       const a=-angle+2*angle*k/8;points.push(well.center[0]+well.innerRadiusUm*Math.cos(a),well.center[1]+well.innerRadiusUm*Math.sin(a),z0+sign*well.contactHalfHeightUm);
      }
      for(let k=0;k<8;k++){const a=2*k;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();dispose.push(g);
      const material=mat(col,.9);scene.add(new T.Mesh(g,material));sources.push({channel:ch.index,material,selectedOpacity:.95,otherOpacity:.4});
     }
    }
   }else{
    const sourceGeom=new T.SphereGeometry(1,24,18);dispose.push(sourceGeom);
    for(const ch of geometry.channels)for(const [role,col]of [['source','#d8aa64'],['return','#b6c5c9']]){
     const material=mat(col,.36),mesh=new T.Mesh(sourceGeom,material);mesh.position.set(...ch[role]);mesh.scale.setScalar(ch.electrodeRadiusUm);
     scene.add(mesh);sources.push({channel:ch.index,material,selectedOpacity:.36,otherOpacity:.12});
    }
   }
   const pick=new T.Raycaster(),pointer=new T.Vector2();let down=null,lastState=null,raf;
   const start=e=>{down=[e.clientX,e.clientY];};
   const click=e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
    const box=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1);pick.setFromCamera(pointer,camera);
    const hit=pick.intersectObjects([somas,fibers],false)[0];
    if(hit?.instanceId!=null)latest.current.onSelect?.(hit.object===somas?hit.instanceId:segments[hit.instanceId].cell);
   };
   renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',click);
   const updateScale=()=>{
    const pixelsPerUm=host.clientWidth/(camera.right-camera.left)*camera.zoom,targetUm=Math.min(100,Math.max(40,host.clientWidth*.2))/pixelsPerUm,power=10**Math.floor(Math.log10(targetUm));
    const um=([1,2,5].filter(v=>v*power<=targetUm).at(-1)||1)*power;setScale({width:um*pixelsPerUm,um});
   };
   const fit=()=>{
    const width=host.clientWidth,height=host.clientHeight,a=width/height;camera.left=-650*a;camera.right=650*a;camera.top=650;camera.bottom=-650;camera.updateProjectionMatrix();renderer.setSize(width,height,false);updateScale();
   };
   const observer=new ResizeObserver(fit);observer.observe(host);controls.addEventListener('change',updateScale);fit();
   const render=()=>{
    if(stopped)return;
    const p=latest.current;
    if(p!==lastState){
     const colors=geometry.cells.map((c,i)=>shownColor(p.result,p.channel,i,p.colorMode,p.frame));
     segments.forEach((seg,i)=>fibers.setColorAt(i,color.set(colors[seg.cell])));
     geometry.cells.forEach((c,i)=>somas.setColorAt(i,color.set(i===p.selected&&p.colorMode!=='voltage'?PALETTE.selected:colors[i])));
     fibers.instanceColor.needsUpdate=true;somas.instanceColor.needsUpdate=true;
     sources.forEach(s=>{s.material.opacity=s.channel===p.channel?s.selectedOpacity:s.otherOpacity;});lastState=p;
    }
    controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(render);
   };render();
   cleanup=()=>{
    cancelAnimationFrame(raf);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',start);renderer.domElement.removeEventListener('pointerup',click);
    dispose.forEach(item=>item.dispose());renderer.dispose();renderer.domElement.remove();
   };
  }).catch(e=>{if(!stopped){cleanup();setReason(e.message||'3D view unavailable');setFallback(true);}});
  return()=>{stopped=true;cleanup();};
 },[geometry,view,fallback]);
 return <div class="ax-anatomy-wrap">
  <div class="ax-anatomy" ref={mount} aria-label="Synthetic fascicle and electrical source geometry">{fallback&&<Anatomy2D geometry={geometry} result={result} channel={channel} selected={selected} onSelect={onSelect} frame={frame} colorMode={colorMode}/>}</div>
  <div class="ax-view-caption"><span>{fallback?'2D projection · same physical coordinates':'Drag to orbit · scroll to inspect · click a cell'}</span><span>{fallback||view==='cross'?'Cross-section':'Central 2.4 mm window'} · {bipolar?'cells, wells & contacts ×1':'nodal/soma markers ×2 · axons ×1'}</span></div>
  {!fallback&&<div class="ax-scale"><i style={{width:scale.width+'px'}}/><span>{scale.um} µm at focus plane</span></div>}
  {fallback&&<p class="ax-fallback">2D fallback: {reason.replace(/[.]$/,'')}. The numerical calculation is unchanged.</p>}
 </div>;
}
export function Anatomy2D({geometry,result,channel=0,selected=0,onSelect,frame=0,colorMode='recruitment'}){
 const r=geometry.fascicleRadiusUm,bipolar=Boolean(geometry.wells?.length);
 const extent=Math.max(r+100,...geometry.channels.map(ch=>Math.hypot(ch.source[0],ch.source[1])+(ch.electrodeRadiusUm??15)+30));
 return <svg viewBox={[-extent,-extent,2*extent,2*extent].join(' ')} class="ax-fallback-svg" role="img" aria-label="Physical cross-section of the modeled fascicle">
  <circle r={geometry.perineuriumOuterUm} fill="#b9a88522" stroke="#b9a885"/><circle r={r} fill="#28383b" stroke="#6b7e7d"/>
  {bipolar?geometry.wells.map(w=><g key={w.id}><circle cx={w.center[0]} cy={w.center[1]} r={w.innerRadiusUm+w.wallThicknessUm} fill="#7e8987" opacity=".55"/><circle cx={w.center[0]} cy={w.center[1]} r={w.innerRadiusUm} fill="#243336" stroke="#b4bdaf" stroke-width=".6"/></g>):geometry.channels.map(ch=><circle key={ch.id} cx={ch.source[0]} cy={ch.source[1]} r={ch.electrodeRadiusUm} fill={ch.index===channel?'#d8aa6466':'#d8aa6422'} stroke="#d8aa64"/>)}
  {geometry.cells.map((c,i)=><circle key={c.id} cx={c.xUm} cy={c.yUm} r={Math.max(c.somaDiameterUm,c.fiberDiameterUm)*(bipolar ? .5 : 1)} fill={shownColor(result,channel,i,colorMode,frame)} stroke={i===selected?'#fff3d9':'none'} stroke-width={bipolar?1.5:3} tabindex="0" role="button" aria-label={'Inspect '+c.id} onClick={()=>onSelect(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(i);}}}/>)}
  {bipolar&&geometry.channels.map(ch=><line key={ch.id} x1={ch.source[0]} x2={ch.source[0]} y1={ch.source[1]-3} y2={ch.source[1]+3} stroke={ch.index===channel?'#e9ba6f':'#bb985f'} stroke-width="2"/>)}
  <line x1={-extent+30} y1={extent-45} x2={-extent+130} y2={extent-45} stroke="#e7dcc5" stroke-width="2"/>
  <text x={-extent+30} y={extent-20} fill="#e7dcc5" font-size="13">100 µm · {bipolar?'physical scale ×1 · contact pair projected along z':'markers ×2 · return displaced along z'}</text>
 </svg>;
}
export function WellDetail({geometry,result,channel=0,selected=0,frame=0,colorMode='recruitment'}){
 const well=geometry?.wells?.find(w=>w.cellIndex===selected);if(!well)return null;
 const cell=geometry.cells[selected],h=well.halfLengthUm,r=well.innerRadiusUm,outer=r+well.wallThicknessUm,ap=well.apertureRadiusUm,extent=h+35;
 const physicalScale=Math.min(660/(2*extent),65/outer),x=z=>400+z*physicalScale,y=q=>118-q*physicalScale,somaR=cell.somaDiameterUm/2;
 const left=-Math.sqrt(somaR*somaR-(cell.peripheralStemDiameterUm/2)**2),right=Math.sqrt(somaR*somaR-(cell.centralStemDiameterUm/2)**2);
 const color=shownColor(result,channel,selected,colorMode,frame),pair=result?.pairTraces.find(p=>p.channel===channel&&p.cell===selected),transfer=result?.field.transferMatrixMvPerUa[channel]?.[selected];
 const fieldDiagnostic=result?.field.diagnostics[channel],apertures=fieldDiagnostic?.apertures?.filter(a=>a.wellId===well.id)??[];
 const fmt=v=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:6}):'—';
 const wall=(z1,z2,q1,q2)=><rect x={x(z1)} y={y(q2)} width={x(z2)-x(z1)} height={y(q1)-y(q2)} fill="#84908d" stroke="#b7c0b5" stroke-width=".6"/>;
 return <article class="ax-well-detail">
  <div class="ax-plot-header"><h3>{cell.id} · {well.id} · longitudinal well section</h3><span>Same physical geometry as the field mesh</span></div>
  <svg viewBox="0 0 800 238" role="img" aria-label={'Physical bipolar cell and aperture section for '+cell.id}>
   <rect x={x(-h)} y={y(r)} width={x(h)-x(-h)} height={y(-r)-y(r)} fill="#33464a"/>
   {wall(-h,h,r,outer)}{wall(-h,h,-outer,-r)}
   {[-1,1].map(sign=><g>{wall(sign<0?-h:h-well.wallThicknessUm,sign<0?-h+well.wallThicknessUm:h,ap,r)}{wall(sign<0?-h:h-well.wallThicknessUm,sign<0?-h+well.wallThicknessUm:h,-r,-ap)}</g>)}
   {segmentsFor(cell,extent,true).map((seg,i)=><rect key={i} x={x(seg.from)} y={y(seg.diameter/2)} width={x(seg.to)-x(seg.from)} height={seg.diameter*physicalScale} fill={color} opacity=".9"/>)}
   <ellipse cx={x(0)} cy={y(0)} rx={(x(somaR)-x(0))} ry={somaR*physicalScale} fill={color} stroke="#d1d8c4" stroke-width=".7"/>
   {[-1,1].map((sign,i)=><g><line x1={x(sign*well.contactSeparationUm/2-well.contactHalfHeightUm)} x2={x(sign*well.contactSeparationUm/2+well.contactHalfHeightUm)} y1={y(r)} y2={y(r)} stroke={i===0?'#e9ba6f':'#c7dadf'} stroke-width="4"/><text x={x(sign*well.contactSeparationUm/2)} y={y(outer)-12} text-anchor="middle">{i===0?'source':'return'}</text></g>)}
   <text x={x(-extent)} y="34">peripheral process</text><text x={x(extent)} y="34" text-anchor="end">central process</text>
   <line x1={x(h)} x2={x(h+12)} y1={y(ap)} y2={y(ap)} stroke="#cbd4c8"/><line x1={x(h)} x2={x(h+12)} y1={y(-ap)} y2={y(-ap)} stroke="#cbd4c8"/>
   <text x={x(h+14)} y={y(0)+4}>⌀ {2*ap} µm</text>
   <line x1={x(-h)} x2={x(h)} y1="192" y2="192" stroke="#899c99"/><text x={x(0)} y="211" text-anchor="middle">well length {2*h} µm · soma ⌀ {cell.somaDiameterUm} µm · wall {well.wallThicknessUm} µm</text>
   <line x1="70" x2={70+(x(20)-x(0))} y1="225" y2="225" stroke="#e7dcc5" stroke-width="2"/><text x="70" y="236">20 µm longitudinal</text>
  </svg>
  <p class="ax-fine">All physical dimensions use the same scale. Contact faces are shown as lines; metal thickness is not modeled. The spherical soma, asymmetric stems and open aperture clearances use the retained physical dimensions. The full cable extends beyond this crop.</p>
  {result&&<dl><dt>Central soma-band mean field transfer</dt><dd>{fmt(transfer?.[result.morphology.somaIndex])} mV/µA</dd><dt>Earliest observed active-site crossing</dt><dd>{pair?.assigned.initiatingSite?pair.assigned.initiatingSite.role.replaceAll('_',' ')+' at '+fmt(pair.assigned.initiatingSite.timeMs)+' ms':'No crossing in the observed window'}</dd><dt>Interpretation</dt><dd>First threshold crossing is not by itself the source of depolarization. Compare the regional, soma-only and whole-cell interventions.</dd></dl>}
  {apertures.length>0&&<><div class="ax-table-scroll"><table><thead><tr><th>Aperture</th><th>Fluid area / µm²</th><th>Outward current / µA per +1 µA drive</th><th>Bore drop / mV per +1 µA drive</th><th>Bore resistance / kΩ</th></tr></thead><tbody>{apertures.map(a=><tr><td>{a.direction}</td><td>{fmt(a.conductingAreaUm2)}</td><td>{fmt(a.outwardCurrentUaPerUa)}</td><td>{fmt(a.meanPotentialDropMvPerUa)}</td><td>{a.measuredBoreResistanceMvPerUa==null?'Unresolved: current too small':fmt(a.measuredBoreResistanceMvPerUa)}</td></tr>)}</tbody></table></div><p class="ax-fine">Signed coefficients refer to a +1 µA source/return trial; pulse polarity changes their signs. The current leaving one end returns through the other, so adding their absolute values would double-count the path. The displayed ratio is the resolved bore drop divided by its current; access and near-field effects belong to the full electrode-pair response ({fmt(fieldDiagnostic.pairArtifactMvPerUa)} kΩ). Narrower-aperture studies recalculate the field.</p></>}
 </article>;
}
