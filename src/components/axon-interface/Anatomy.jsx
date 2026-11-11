import {useEffect,useRef,useState} from 'preact/hooks';
const PALETTE={silent:'#6c8792',lost:'#8bbda5',persists:'#d8a65d',appears:'#c881a7',selected:'#f4ead6'};
export function cellColor(result,channel,i){const a=result?.matrices.assigned[channel]?.[i],b=result?.matrices.localSilenced[channel]?.[i];return a?(b?PALETTE.persists:PALETTE.lost):b?PALETTE.appears:PALETTE.silent;}
export function voltageColor(value){if(!Number.isFinite(value))return PALETTE.silent;const a=[57,100,122],b=[233,208,137],c=[190,77,60],q=Math.max(0,Math.min(1,(value+100)/160)),lo=q<.625?a:b,hi=q<.625?b:c,t=q<.625?q/.625:(q-.625)/.375;return 'rgb('+lo.map((v,i)=>Math.round(v+(hi[i]-v)*t)).join(',')+')';}
function shownColor(result,channel,i,colorMode,frame){if(colorMode!=='voltage'||!result)return cellColor(result,channel,i);const trace=result.pairTraces.find(p=>p.channel===channel&&p.cell===i)?.assigned,index=trace?.nodeOrdinals.indexOf(Math.floor(result.settings.nodeCount/2));return voltageColor(trace?.voltageMv[index]?.[frame]);}
export default function Anatomy({geometry,result,channel=0,selected=0,onSelect,view='oblique',frame=0,colorMode='recruitment'}){
 const mount=useRef(null),runtime=useRef(null),latest=useRef(null),[fallback,setFallback]=useState(false),[scale,setScale]=useState({width:80,um:100}),[reason,setReason]=useState('');
 latest.current={result,channel,selected,colorMode,frame,onSelect};
 useEffect(()=>{let stopped=false,cleanup=()=>{};const host=mount.current;if(!host||fallback)return;
 Promise.all([import('three'),import('three/examples/jsm/controls/OrbitControls.js')]).then(([T,{OrbitControls}])=>{
 if(stopped)return;let renderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}catch(e){setReason(e.message||'WebGL unavailable');setFallback(true);return;}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0x202a2d,1);host.append(renderer.domElement);
 const scene=new T.Scene(),r=geometry.fascicleRadiusUm,half=1200,aspect=host.clientWidth/host.clientHeight;
 const camera=new T.OrthographicCamera(-650*aspect,650*aspect,650,-650,1,20000);
 camera.position.set(...(view==='cross'?[0,0,4000]:view==='longitudinal'?[4000,0,100]:[1000,750,1700]));camera.lookAt(0,0,100);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,100);controls.enableDamping=true;controls.dampingFactor=.1;controls.minZoom=.25;controls.maxZoom=25;
 scene.add(new T.AmbientLight(0xffffff,2.3));const light=new T.DirectionalLight(0xffecd2,3);light.position.set(800,800,1500);scene.add(light);
 const dispose=[],sources=[];const mat=(color,opacity=1)=>{const m=new T.MeshStandardMaterial({color,roughness:.65,metalness:.1,transparent:opacity<1,opacity,depthWrite:opacity===1,side:T.DoubleSide});dispose.push(m);return m;};
 function cylinder(radius,length,material){const g=new T.CylinderGeometry(radius,radius,length,64,1,true);g.rotateX(Math.PI/2);dispose.push(g);const o=new T.Mesh(g,material);scene.add(o);}
 cylinder(geometry.perineuriumOuterUm,half*2,mat('#b9a885',.085));cylinder(r,half*2,mat('#b8c7bc',.035));
 const ringMaterial=new T.LineBasicMaterial({color:'#b9a885',transparent:true,opacity:.75});dispose.push(ringMaterial);
 for(const z of [-half,0,half]){const pts=Array.from({length:97},(_,i)=>new T.Vector3(Math.cos(i/96*2*Math.PI)*geometry.perineuriumOuterUm,Math.sin(i/96*2*Math.PI)*geometry.perineuriumOuterUm,z)),g=new T.BufferGeometry().setFromPoints(pts);dispose.push(g);scene.add(new T.Line(g,ringMaterial));}
 const tubeGeom=new T.CylinderGeometry(1,1,half*2,7);tubeGeom.rotateX(Math.PI/2);dispose.push(tubeGeom);
 const fibers=new T.InstancedMesh(tubeGeom,mat('#ffffff',.74),geometry.cells.length),obj=new T.Object3D(),color=new T.Color();
 geometry.cells.forEach((c,i)=>{obj.position.set(c.xUm,c.yUm,0);obj.scale.set(c.fiberDiameterUm*.5,c.fiberDiameterUm*.5,1);obj.updateMatrix();fibers.setMatrixAt(i,obj.matrix);fibers.setColorAt(i,color.set(PALETTE.silent));});scene.add(fibers);
 const somaGeometry=new T.SphereGeometry(1,12,9);dispose.push(somaGeometry);const somas=new T.InstancedMesh(somaGeometry,mat('#ffffff'),geometry.cells.length);
 geometry.cells.forEach((c,i)=>{const d=c.somaDiameterUm||c.fiberDiameterUm;obj.position.set(c.xUm,c.yUm,0);obj.scale.setScalar(d);obj.updateMatrix();somas.setMatrixAt(i,obj.matrix);somas.setColorAt(i,color.set(PALETTE.silent));});scene.add(somas);
 const sourceGeom=new T.SphereGeometry(1,24,18);dispose.push(sourceGeom);
 for(const ch of geometry.channels)for(const [type,col] of [['source','#d8aa64'],['return','#b6c5c9']]){const material=mat(col,.36),mesh=new T.Mesh(sourceGeom,material);mesh.position.set(...ch[type]);mesh.scale.setScalar(ch.electrodeRadiusUm);scene.add(mesh);sources.push({channel:ch.index,material});}
 const pick=new T.Raycaster(),pointer=new T.Vector2();let down=null,lastState=null;
 const start=e=>{down=[e.clientX,e.clientY];};
 const click=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const box=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1);pick.setFromCamera(pointer,camera);const hits=pick.intersectObjects([somas,fibers],false);if(hits[0]?.instanceId!=null)latest.current.onSelect?.(hits[0].instanceId);};
 renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',click);
 const updateScale=()=>{const pixelsPerUm=host.clientWidth/(camera.right-camera.left)*camera.zoom,targetUm=Math.min(100,Math.max(40,host.clientWidth*.2))/pixelsPerUm,power=10**Math.floor(Math.log10(targetUm)),um=([1,2,5].filter(v=>v*power<=targetUm).at(-1)||1)*power;setScale({width:um*pixelsPerUm,um});};
 const fit=()=>{const w=host.clientWidth,h=host.clientHeight,a=w/h;camera.left=-650*a;camera.right=650*a;camera.top=650;camera.bottom=-650;camera.updateProjectionMatrix();renderer.setSize(w,h,false);updateScale();};
 const observer=new ResizeObserver(fit);observer.observe(host);fit();let raf;
 const render=()=>{if(stopped)return;const p=latest.current;if(p!==lastState){geometry.cells.forEach((c,i)=>{const v=shownColor(p.result,p.channel,i,p.colorMode,p.frame);fibers.setColorAt(i,color.set(v));somas.setColorAt(i,color.set(i===p.selected&&p.colorMode!=='voltage'?PALETTE.selected:v));});fibers.instanceColor.needsUpdate=true;somas.instanceColor.needsUpdate=true;sources.forEach(s=>s.material.opacity=s.channel===p.channel?.36:.12);lastState=p;}controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(render);};
 controls.addEventListener('change',updateScale);
 const lost=e=>{e.preventDefault();setReason('WebGL context lost');setFallback(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
 runtime.current={scene,camera,controls};render();
 cleanup=()=>{cancelAnimationFrame(raf);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',start);renderer.domElement.removeEventListener('pointerup',click);renderer.domElement.removeEventListener('webglcontextlost',lost);for(const d of dispose)d.dispose();renderer.dispose();renderer.domElement.remove();runtime.current=null;};
 }).catch(e=>{setReason(e.message);setFallback(true);});return()=>{stopped=true;cleanup();};
 },[geometry,view,fallback]);
 return <div class="ax-anatomy-wrap"><div class="ax-anatomy" ref={mount} aria-label="Synthetic fascicle and electrical source geometry">{fallback&&<Anatomy2D geometry={geometry} result={result} channel={channel} selected={selected} onSelect={onSelect} frame={frame} colorMode={colorMode}/>}</div><div class="ax-view-caption"><span>{fallback?'2D projection · same physical coordinates':'Drag to orbit · scroll to inspect · click a cell'}</span><span>{fallback||view==='cross'?'Cross-section':'Central 2.4 mm window'} · nodal/soma markers ×2 · axons ×1</span></div>{!fallback&&<div class="ax-scale"><i style={{width:scale.width+'px'}}/><span>{scale.um} µm at focus plane</span></div>}{fallback&&<p class="ax-fallback">2D fallback: {reason.replace(/[.]$/,'')}. The numerical calculation is unchanged.</p>}</div>;
}
export function Anatomy2D({geometry,result,channel,selected,onSelect,frame=0,colorMode='recruitment'}){
 const r=geometry.fascicleRadiusUm,extent=Math.max(r+100,...geometry.channels.map(ch=>Math.hypot(ch.source[0],ch.source[1])+ch.electrodeRadiusUm+30));
 return <svg viewBox={[-extent,-extent,2*extent,2*extent].join(' ')} class="ax-fallback-svg" role="img" aria-label="Physical cross-section of the modeled fascicle"><circle r={geometry.perineuriumOuterUm} fill="#b9a88522" stroke="#b9a885"/><circle r={r} fill="#28383b" stroke="#6b7e7d"/>{geometry.channels.map(ch=><circle key={ch.id} cx={ch.source[0]} cy={ch.source[1]} r={ch.electrodeRadiusUm} fill={ch.index===channel?'#d8aa6466':'#d8aa6422'} stroke="#d8aa64"/>)}{geometry.cells.map((c,i)=><circle key={c.id} cx={c.xUm} cy={c.yUm} r={Math.max(c.somaDiameterUm,c.fiberDiameterUm)} fill={shownColor(result,channel,i,colorMode,frame)} stroke={i===selected?'#fff3d9':'none'} stroke-width="3" tabindex="0" role="button" aria-label={'Inspect '+c.id} onClick={()=>onSelect(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(i);}}}/>)}<line x1={-extent+30} y1={extent-45} x2={-extent+130} y2={extent-45} stroke="#e7dcc5" stroke-width="2"/><text x={-extent+30} y={extent-20} fill="#e7dcc5" font-size="14">100 µm · markers ×2 · return displaced along z</text></svg>;
}

