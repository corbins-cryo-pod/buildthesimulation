import { useEffect, useRef, useState } from 'preact/hooks';
import * as THREE from 'three';
import { coneSurface, VIEW_MODES } from '../../lib/cell-growth/render-geometry.js';
import { shaftProfile, wavePosition } from '../../lib/cell-growth/morphogenesis.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const AXON = 0x8ecfc5;
const DENDRITE = 0xd9b57b;
const SOMA = 0xded8c2;
const asVector = p => new THREE.Vector3(...p);
const colorFor = (segment, view) => view === 'microtubules' ? new THREE.Color().setHSL(.06 + .4 * Math.min(1, segment.mt ?? 0), .55, .6) : new THREE.Color(segment.kind === 'axon' ? AXON : DENDRITE);

function dispose(group) {
  group.traverse(object => { object.geometry?.dispose(); if (Array.isArray(object.material)) object.material.forEach(m => m.dispose()); else object.material?.dispose(); });
  group.clear();
}

function line(points, color, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(asVector));
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false }));
}

function buildWorld(state) {
  const group = new THREE.Group(), world = state.world;
  const min = world.bounds?.min || [-250, -100, -250], max = world.bounds?.max || [250, 100, 250];
  const width = Math.max(max[0] - min[0], max[2] - min[2]);
  const plane = new THREE.GridHelper(width, 20, 0x526159, 0x2c3934);
  plane.position.set((min[0] + max[0]) / 2, min[1] - 2, (min[2] + max[2]) / 2);
  plane.material.transparent = true; plane.material.opacity = .48; group.add(plane);
  if (world.sphereRadius) {
    const boundary = new THREE.Mesh(new THREE.SphereGeometry(world.sphereRadius, 32, 20), new THREE.MeshBasicMaterial({ color: 0x7c9a8e, wireframe: true, transparent: true, opacity: .09, depthWrite: false }));
    group.add(boundary);
    const ring = new THREE.EllipseCurve(0, 0, world.sphereRadius, world.sphereRadius, 0, Math.PI * 2).getPoints(128);
    group.add(line(ring.map(p => [p.x, 0, p.y]), 0x91a59a, .3));
  } else {
    const box = new THREE.Box3(asVector(min), asVector(max));
    const helper = new THREE.Box3Helper(box, 0x62766b); helper.material.transparent = true; helper.material.opacity = .3; group.add(helper);
  }
  for (const obstacle of world.obstacles || []) {
    const isBox = obstacle.shape === 'box';
    const geometry = isBox ? new THREE.BoxGeometry(...obstacle.size) : new THREE.SphereGeometry(obstacle.radius, 24, 16);
    const color = world.mode === 'biohybrid' ? 0x9d8d66 : 0x63736c;
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .65, metalness: world.mode === 'biohybrid' ? .35 : 0, transparent: true, opacity: .38 }));
    mesh.position.copy(asVector(obstacle.position)); group.add(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: world.mode === 'biohybrid' ? 0xc5ac75 : 0x87998a, transparent: true, opacity: .45 }));
    edges.position.copy(mesh.position); group.add(edges);
  }
  if (world.cue?.position && state.config.guidance > 0) {
    const location = asVector(world.cue.position);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xbf9dc3, transparent: true, opacity: .7 }));
    beacon.position.copy(location); group.add(beacon);
    [9, 17, 26].forEach(radius => {
      const points = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2).getPoints(64);
      const ring = line(points.map(p => [p.x + location.x, location.y, p.y + location.z]), 0xb796bd, .3);
      group.add(ring);
    });
  }
  return group;
}

export default function GrowthScene({ state, selectedCell, selectedTip, onSelect, isolate, showMembrane, showCytoskeleton, showForces, colorMode, thickness = 1, cameraAction, inspectionMode = 'structural', showTrails = true, onUnavailable }) {
  const container = useRef(null), api = useRef(null), latest = useRef(null);
  const [error, setError] = useState('');
  const scaleBar=useRef(null),scaleText=useRef(null);
  latest.current = { state, selectedCell, selectedTip, onSelect, isolate, showMembrane, showCytoskeleton, showForces, colorMode, thickness, inspectionMode, showTrails };

  useEffect(() => {
    if (!container.current) return;
    const host = container.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); }
    catch { onUnavailable?.();setError('The 3D view requires WebGL. The numerical model, measurements and downloads are still available.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setClearColor(0x151d1a);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Three-dimensional simulated neurons. Drag to orbit, scroll to zoom, and click a soma or neurite to select its cell.');
    renderer.domElement.setAttribute('role', 'img');
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xe5eadb, 2));
    const sun = new THREE.DirectionalLight(0xf7e6ca, 2.4); sun.position.set(100, 300, 200); scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9bc8c0, 1.5); rim.position.set(-100, 80, -100); scene.add(rim);
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 20000);
    camera.position.set(450, 600, 650);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .12; controls.minDistance = 12; controls.maxDistance = 4000;
    const cellsGroup = new THREE.Group(), conesGroup = new THREE.Group(), forcesGroup = new THREE.Group(), contactGroup = new THREE.Group();
    scene.add(cellsGroup, conesGroup, forcesGroup, contactGroup);
    const rodGeometry = new THREE.CylinderGeometry(1, 1, 1, 10, 1);
    rodGeometry.setAttribute('radiusRatio',new THREE.InstancedBufferAttribute(new Float32Array(30000).fill(1),1));
    const rods = new THREE.InstancedMesh(rodGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .48, metalness: .03, transparent: true, opacity: .9 }), 30000);
    rods.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rods.count = 0; rods.frustumCulled = false;
    rods.material.roughness=.78;rods.material.metalness=0;
    rods.material.onBeforeCompile=shader=>{
      shader.vertexShader='attribute float radiusRatio;\n'+shader.vertexShader;
      // Match the normals to the frustum slope. Instance normal scaling then
      // accounts for the segment's physical length and proximal radius.
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n objectNormal.y += (1.0 - radiusRatio) * length(objectNormal.xz);');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.xz *= mix(1.0, radiusRatio, position.y + 0.5);');
    };
    const cores = new THREE.InstancedMesh(rodGeometry.clone(), new THREE.MeshBasicMaterial({ color: 0xf4e4ad, transparent: true, opacity: .85 }), 30000);
    cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cores.count = 0; cores.frustumCulled = false;
    const joints = new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7), rods.material.clone(),30000);
    joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);joints.count=0;joints.frustumCulled=false;
    scene.add(rods, cores, joints);
    let frame, worldGroup = null, worldKey = null, active = true;
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let startPointer = null;
    const onDown = event => { startPointer = [event.clientX, event.clientY]; };
    const onUp = event => {
      if (!startPointer || Math.hypot(event.clientX - startPointer[0], event.clientY - startPointer[1]) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([cellsGroup, conesGroup, rods], true)[0];
      if (hit) {
        const record = hit.object === rods ? api.current.segmentMap[hit.instanceId] : hit.object.userData;
        if (record?.cellId !== undefined) latest.current.onSelect(record.cellId, record.tipId ?? null);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const render = () => { if (!active) return; controls.update();
      const umPerPixel=2*camera.position.distanceTo(controls.target)*Math.tan(camera.fov*Math.PI/360)/Math.max(1,host.clientHeight),target=umPerPixel*95;
      const power=10**Math.floor(Math.log10(target)),bar=[1,2,5,10].map(x=>x*power).find(x=>x>=target)||power*10;
      if(scaleBar.current)scaleBar.current.style.width=`${bar/umPerPixel}px`;
      if(scaleText.current)scaleText.current.textContent=`${bar<1?bar.toFixed(1):bar} µm`;
      renderer.render(scene, camera); frame = requestAnimationFrame(render); };
    api.current = { renderer, scene, camera, controls, cellsGroup, conesGroup, forcesGroup, contactGroup, rods, cores, joints, cellCache:new Map(), segmentMap: [],
      setWorld: (data) => { const key = JSON.stringify([data.config.mode, data.config.seed, data.world]); if (key === worldKey) return; if (worldGroup) { scene.remove(worldGroup); dispose(worldGroup); } worldGroup = buildWorld(data); scene.add(worldGroup); worldKey = key; },
    };
    render();
    return () => {
      active = false; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onUp);
      dispose(scene); renderer.dispose(); renderer.domElement.remove(); api.current = null;
    };
  }, []);

  useEffect(() => {
    if (!state || !api.current) return;
    const { cellsGroup, conesGroup, forcesGroup, contactGroup, rods, cores, joints, cellCache } = api.current;
    api.current.setWorld(state);
    [conesGroup, forcesGroup, contactGroup].forEach(dispose);
    const theme=VIEW_MODES[inspectionMode]||VIEW_MODES.structural;
    api.current.renderer.setClearColor(theme.background);
    rods.material.opacity=inspectionMode==='fluorescence'?.74:.93;joints.material.opacity=rods.material.opacity;
    cores.material.color.set(theme.core);
    for(const [id,entry] of cellCache)if(!state.cells.some(c=>c.id===id)||isolate&&id!==selectedCell){cellsGroup.remove(entry.group);dispose(entry.group);cellCache.delete(id);}
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), scale = new THREE.Vector3();
    const segments = state.segments.filter(s => s.alive !== false && (!isolate || s.cellId === selectedCell)),profiles=shaftProfile(state);
    const visibleSegments = segments.slice(0, 30000);
    api.current.segmentMap = visibleSegments;
    const selectedColor = new THREE.Color(0xffecc1);
    for (let index = 0; index < visibleSegments.length; index++) {
      const segment = visibleSegments[index], start = asVector(segment.start), end = asVector(segment.end), direction = end.clone().sub(start), length = direction.length();
      quaternion.setFromUnitVectors(up, length > 1e-8 ? direction.normalize() : up);
      const profile=profiles.get(segment.id),r=Math.max(.05,(inspectionMode==='mechanics'?segment.radius:profile.r0)*thickness),endRadius=Math.max(.05,(inspectionMode==='mechanics'?segment.radius:profile.r1)*thickness);
      rods.geometry.attributes.radiusRatio.setX(index,endRadius/r);
      scale.set(r, Math.max(.0001, length), r);
      matrix.compose(start.clone().add(end).multiplyScalar(.5), quaternion, scale); rods.setMatrixAt(index, matrix);
      const color = colorFor(segment, colorMode);
      if (!isolate && selectedCell != null && segment.cellId !== selectedCell) color.multiplyScalar(.64);
      else if (segment.cellId === selectedCell) color.lerp(selectedColor, .08);
      if(inspectionMode==='brightfield')color.set(0x7f8e82);
      rods.setColorAt(index, color);joints.setColorAt(index,color);
      matrix.compose(end,new THREE.Quaternion(),new THREE.Vector3(endRadius,endRadius,endRadius));joints.setMatrixAt(index,matrix);
      scale.set(r * .23, Math.max(.0001, length), r * .23); matrix.compose(start.clone().add(end).multiplyScalar(.5), quaternion, scale); cores.setMatrixAt(index, matrix);
    }
    rods.geometry.attributes.radiusRatio.needsUpdate=true;
    joints.count=visibleSegments.length;joints.instanceMatrix.needsUpdate=true;if(joints.instanceColor)joints.instanceColor.needsUpdate=true;
    rods.count = visibleSegments.length; cores.count = showCytoskeleton ? visibleSegments.length : 0;
    rods.instanceMatrix.needsUpdate = true; if (rods.instanceColor) rods.instanceColor.needsUpdate = true; cores.instanceMatrix.needsUpdate = true;
    for (const cell of state.cells) {
      if(isolate&&cell.id!==selectedCell)continue;
      const selected=cell.id===selectedCell,m=cell.membrane;
      let entry=cellCache.get(cell.id);
      if(!entry){
        const group=new THREE.Group(),geo=new THREE.BufferGeometry();
        geo.setAttribute('position',new THREE.Float32BufferAttribute(m.vertices.flat(),3));geo.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(m.vertices.length*3),3));geo.setIndex(m.triangles.flat());
        const material=new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.82,metalness:0,transparent:true,opacity:theme.opacity,side:THREE.DoubleSide,depthWrite:false,clearcoat:0});
        const mesh=new THREE.Mesh(geo,material);mesh.userData={cellId:cell.id};group.add(mesh);
        const nucleus=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshStandardMaterial({roughness:.48,transparent:true,opacity:.84}));nucleus.userData={cellId:cell.id};group.add(nucleus);
        const internal=new THREE.Group();group.add(internal);cellsGroup.add(group);entry={group,mesh,nucleus,internal};cellCache.set(cell.id,entry);
      }
      const {mesh,nucleus,internal}=entry,position=mesh.geometry.attributes.position,colors=mesh.geometry.attributes.color;
      dispose(internal);
      for(let i=0;i<m.vertices.length;i++){
        position.setXYZ(i,...m.vertices[i]);const color=new THREE.Color(theme.membrane);
        if(inspectionMode==='mechanics'){const magnitude=Math.hypot(...(m.forces?.[i]||[0,0,0]));color.setHSL(.52-.48*Math.min(1,magnitude/35),.48,.57);}
        else if(inspectionMode==='fluorescence')color.lerp(new THREE.Color(theme.actin),.7*(m.actin?.[i]??0));
        else color.lerp(new THREE.Color(theme.actin),.22*(m.actin?.[i]??0));
        colors.setXYZ(i,color.r,color.g,color.b);
      }
      position.needsUpdate=true;colors.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
      mesh.material.opacity=showMembrane?theme.opacity:.07;
      nucleus.position.copy(asVector(cell.nucleus?.position||cell.position));nucleus.scale.setScalar(cell.nucleus?.radius||cell.radius*.38);nucleus.material.color.set(theme.nucleus);
      if(showCytoskeleton&&selected){
        // These spokes depict coarse MT support, not individually tracked polymers.
        for(let i=0;i<m.vertices.length;i+=7){const fraction=m.mt?.[i]??.3;if(fraction<.1)continue;const origin=cell.nucleus?.position||cell.position,end=m.vertices[i];internal.add(line([origin,origin.map((v,k)=>v+(end[k]-v)*(.55+.35*fraction))],theme.core,.18+.45*fraction));}
        if(inspectionMode==='mechanics'){const wire=new THREE.LineSegments(new THREE.WireframeGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:0xd5c6a6,transparent:true,opacity:.2}));internal.add(wire);}
      }
      if(selected){
        const r=cell.mechanics?.collisionRadius||cell.radius;
        const ring=new THREE.EllipseCurve(0,0,r+1.8,r+1.8,0,Math.PI*2).getPoints(64);internal.add(line(ring.map(p=>[p.x+cell.position[0],cell.position[1],p.y+cell.position[2]]),inspectionMode==='brightfield'?0x556d61:0xd5c6a0,.48));
      }
      if(showTrails&&cell.mechanics?.trail.length>1)internal.add(line(cell.mechanics.trail.map(p=>p.position),inspectionMode==='brightfield'?0x6a817b:0x7d9d9b,selected?.65:.25));
      if(inspectionMode==='mechanics'||showForces){
        for(const i of m.contactVertices||[]){const point=new THREE.Mesh(new THREE.SphereGeometry(.25,6,4),new THREE.MeshBasicMaterial({color:0xee9079}));point.position.copy(asVector(m.vertices[i]));internal.add(point);}
        if(selected&&cell.mechanics){const traction=asVector(cell.mechanics.traction),mag=traction.length();if(mag>1e-8)internal.add(new THREE.ArrowHelper(traction.normalize(),asVector(cell.position),Math.min(20,mag*.018),0x8bd4b7,1.8,1));}
      }
    }
    for(const bud of state.buds||[]){
      if(bud.length<.02||isolate&&bud.cellId!==selectedCell)continue;
      const a=asVector(bud.start),b=asVector(bud.end),delta=b.clone().sub(a);
      const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.08*thickness,(bud.precursor==='lamellipodium'?.3:.1)*thickness,delta.length(),6),new THREE.MeshStandardMaterial({color:theme.actin,roughness:.85,transparent:true,opacity:.65}));
      stalk.position.copy(a.add(b).multiplyScalar(.5));stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());stalk.userData={cellId:bud.cellId};conesGroup.add(stalk);
    }
    if(showCytoskeleton)for(const wave of state.waves||[]){
      if(isolate&&wave.cellId!==selectedCell)continue;const p=wavePosition(state,wave);if(!p)continue;
      const marker=new THREE.Mesh(new THREE.SphereGeometry(.8,8,6),new THREE.MeshBasicMaterial({color:theme.actin,transparent:true,opacity:.72}));
      marker.position.copy(asVector(p));marker.userData={cellId:wave.cellId};conesGroup.add(marker);
    }
    const visibleTips = state.tips.filter(t => t.active && (!isolate || t.cellId === selectedCell));
    for (const tip of visibleTips) {
      const segment = state.segments[tip.segmentId] || state.segments.find(s => s.id === tip.segmentId);
      if (!segment || segment.alive === false) continue;
      const selected = tip.id === selectedTip;
      const radius = (tip.radius || 1.9) * thickness;
      const group = new THREE.Group(), color = tip.kind === 'axon' ? AXON : DENDRITE;
      group.position.copy(asVector(segment.end));
      const z=asVector(tip.direction).normalize(),x=new THREE.Vector3().crossVectors(Math.abs(z.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),z).normalize(),y=new THREE.Vector3().crossVectors(z,x);
      group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      const solved=coneSurface(tip),geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(solved.vertices.flat().map(v=>v*thickness),3));geometry.setIndex(solved.triangles.flat());geometry.computeVertexNormals();
      const cone=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:inspectionMode==='brightfield'?0x859b8d:selected?theme.actin:color,transparent:true,opacity:.65,roughness:.5,side:THREE.DoubleSide,depthWrite:false}));
      cone.userData={cellId:tip.cellId,tipId:tip.id};group.add(cone);
      if(showCytoskeleton&&selected){
        const radii=tip.shape?.radii||Array(12).fill(radius);
        for(let i=0;i<radii.length;i++){const a=i/radii.length*Math.PI*2;group.add(line([[0,0,0],[Math.sin(a)*radii[i]*.95*thickness,0,Math.cos(a)*radii[i]*.95*thickness]],theme.actin,.55));}
      }
      conesGroup.add(group);
      for(const probe of tip.filopodia||[]){if(probe.length<.02)continue;
        const a=asVector(probe.start),b=asVector(probe.end),delta=b.clone().sub(a);
        const stalk=new THREE.Mesh(new THREE.CylinderGeometry(probe.radius*thickness,probe.radius*thickness,delta.length(),6),new THREE.MeshStandardMaterial({color:probe.blocked?0xea9f86:theme.actin,roughness:.7}));
        stalk.position.copy(a.add(b).multiplyScalar(.5));stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());stalk.userData={cellId:tip.cellId,tipId:tip.id};conesGroup.add(stalk);
      }
    }
    if (showForces) {
      const tip = state.tips.find(t => t.id === selectedTip && t.active) || state.tips.find(t => t.cellId === selectedCell && t.active);
      const segment = tip && state.segments.find(s => s.id === tip.segmentId);
      if (tip && segment) {
        const origin = asVector(segment.end), direction = asVector(tip.direction).normalize();
        const forward = Math.max(3, Math.min(24, (tip.forces?.traction || 0) * .12));
        const backward = Math.max(3, Math.min(20, (tip.forces?.membrane || 0) * .2));
        if ((tip.forces?.traction || 0) > 1e-12) forcesGroup.add(new THREE.ArrowHelper(direction, origin, forward, 0x9bddc5, 2.5, 1.6));
        if ((tip.forces?.membrane || 0) > 1e-12) forcesGroup.add(new THREE.ArrowHelper(direction.clone().negate(), origin.clone().add(new THREE.Vector3(0, 1.5, 0)), backward, 0xea9f86, 2.5, 1.6));
      }
    }
    for (const contact of (state.contacts || []).filter(c => c.candidate && c.status === 'candidate' && c.position && (!isolate || c.sourceCellId === selectedCell || c.targetCellId === selectedCell)).slice(0, 200)) {
      const point = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xdbbae1 }));
      point.position.copy(asVector(contact.position)); contactGroup.add(point);
    }
  }, [state, selectedCell, selectedTip, isolate, showMembrane, showCytoskeleton, showForces, colorMode, thickness,inspectionMode,showTrails]);

  useEffect(() => {
    if (!api.current || !state) return;
    const { camera, controls } = api.current;
    const action = cameraAction?.type || 'fit';
    let center = new THREE.Vector3(), extent = 350;
    if (action === 'cell') {
      const cell = state.cells.find(c => c.id === selectedCell);
      const points = [...(cell ? [asVector(cell.position)] : []), ...state.segments.filter(s => s.cellId === selectedCell && s.alive !== false).map(s => asVector(s.end))];
      if (points.length) new THREE.Box3().setFromPoints(points).getCenter(center);
      extent = Math.max(35,...points.map(point=>point.distanceTo(center)*1.12));
    } else if (action === 'tip') {
      const tip = state.tips.find(t => t.id === selectedTip) || state.tips.find(t => t.cellId === selectedCell && t.active);
      const segment = tip && state.segments.find(s => s.id === tip.segmentId);
      if (segment) center.copy(asVector(segment.end)); extent = 18;
    } else {
      const min = state.world.bounds?.min || [-250,-100,-250], max = state.world.bounds?.max || [250,100,250];
      center.set((min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2);
      const box=new THREE.Box3();for(const cell of state.cells)box.expandByPoint(asVector(cell.position));for(const segment of state.segments)if(segment.alive)box.expandByPoint(asVector(segment.end));
      box.getCenter(center);const size=box.getSize(new THREE.Vector3());extent=Math.max(45,Math.max(size.x,size.y,size.z)*.53+20);
    }
    controls.target.copy(center);
    const top = action === 'top';
    camera.position.copy(center).add(top ? new THREE.Vector3(0, extent * 2.8, .001) : new THREE.Vector3(extent * 1.4, extent * 1.6, extent * 2));
    controls.update();
  }, [cameraAction, state?.config.mode, state?.config.seed]);

  return <div class="cg-scene" ref={container}><div class="cg-scale"><span ref={scaleText}>50 µm</span><i ref={scaleBar}/></div>{error && <div class="cg-scene-fallback" role="status">{error}</div>}</div>;
}
