import { useEffect, useRef, useState } from 'preact/hooks';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { coiledPoint } from '../../lib/cochlear/geometry.js';
import { fieldSlice } from '../../lib/cochlear/fields.js';

export function voltageColor(value) {
  const stops = [[-80, [71, 98, 121]], [-60, [112, 148, 162]], [-25, [209, 184, 119]], [30, [189, 81, 63]]];
  if (!Number.isFinite(value)) return [87, 87, 83];
  let k = 0; while (k < stops.length - 2 && value > stops[k + 1][0]) k++;
  const [a, b] = [stops[k], stops[k + 1]], t = Math.min(1, Math.max(0, (value - a[0]) / (b[0] - a[0])));
  return a[1].map((x, i) => Math.round(x + t * (b[1][i] - x)));
}

export function replayValue(fiber, compartment, timeMs) {
  const r = fiber?.response;
  if (!r?.replayTimesMs?.length) return -65;
  const dt = r.replayTimesMs[1] - r.replayTimesMs[0] || .2;
  const frame = Math.min(r.replayTimesMs.length - 1, Math.max(0, Math.round(timeMs / dt)));
  return r.replayMv[frame * r.compartmentCount + compartment];
}

function point3(place, distance = 0, separation = 0) {
  const p = coiledPoint(place, distance, separation); return new THREE.Vector3(p[0], p[2], p[1]);
}

function CoiledScene({ geometry, model, fibers, timeMs, selectedContact, selectedFiber, onContact, onFiber, theme, onUnavailable }) {
  const host = useRef(null), state = useRef(null), current = useRef({});
  current.current = { fibers, timeMs, selectedContact, selectedFiber, onContact, onFiber };
  useEffect(() => {
    if (!host.current) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' }); }
    catch { onUnavailable('3D rendering is unavailable. The calculation-space and field views remain available.'); return; }
    const dark = theme === 'dark', scene = new THREE.Scene();
    scene.background = new THREE.Color(dark ? '#252727' : '#ebe6db');
    const camera = new THREE.PerspectiveCamera(36, 1, .05, 100);
    camera.position.set(8, 10, 15); camera.lookAt(0, 2, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    host.current.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Rotatable schematic cochlea, electrode contacts, and calculated nerve membrane-voltage replay');
    renderer.domElement.setAttribute('role', 'img');
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.5, 0); controls.enableDamping = true; controls.minDistance = 5; controls.maxDistance = 30;
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(4, 9, 10); scene.add(light);
    const coilPath = new THREE.CatmullRomCurve3(Array.from({ length: 160 }, (_, i) => point3(i * 35 / 159)));
    const shell = new THREE.Mesh(new THREE.TubeGeometry(coilPath, 240, .27, 10, false), new THREE.MeshPhongMaterial({ color: dark ? '#80949a' : '#acbfc0', transparent: true, opacity: .23, depthWrite: false, shininess: 50 }));
    scene.add(shell);
    const grid = new THREE.GridHelper(14, 14, dark ? '#444744' : '#c3bcae', dark ? '#333734' : '#d6d0c3'); grid.position.y = -.65; scene.add(grid);
    const carrierPath = new THREE.CatmullRomCurve3(Array.from({ length: 100 }, (_, i) => point3(geometry.basalMm + geometry.spanMm * i / 99, 0, geometry.contacts[0].positionMm[2])));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(carrierPath, 140, .055, 6, false), new THREE.MeshPhongMaterial({ color: '#b8a383' })));
    const contacts = geometry.contacts.map((contact, index) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(contact.radiusMm, contact.radiusMm, .06, 20), new THREE.MeshPhongMaterial({ color: '#a68851', shininess: 80 }));
      mesh.position.copy(point3(contact.positionMm[0], 0, contact.positionMm[2])); mesh.userData.contact = index; scene.add(mesh); return mesh;
    });
    const lines = geometry.fibers.map((fiber, index) => {
      const points = Array.from(model.positionsMm, y => point3(fiber.placeMm, y + 1.3));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(points.length * 3), 3));
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: fiber.alive ? .75 : .20 }));
      line.userData.fiber = index; scene.add(line); return line;
    });
    const somaGeometry = new THREE.SphereGeometry(.075, 8, 6);
    const somas = geometry.fibers.map(fiber => {
      const soma = new THREE.Mesh(somaGeometry, new THREE.MeshBasicMaterial({ color: '#8297a1', transparent: true, opacity: fiber.alive ? .9 : .15 }));
      soma.position.copy(point3(fiber.placeMm, model.positionsMm[model.somaIndex] + 1.3)); soma.userData.fiber = fiber.index; scene.add(soma); return soma;
    });
    const ray = new THREE.Raycaster(); ray.params.Line.threshold = .10;
    const pointer = new THREE.Vector2(); let start = null;
    const down = e => { start = [e.clientX, e.clientY]; };
    const up = e => {
      if (!start || Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 5) return;
      const r = renderer.domElement.getBoundingClientRect(); pointer.set(2 * (e.clientX - r.left) / r.width - 1, 1 - 2 * (e.clientY - r.top) / r.height);
      ray.setFromCamera(pointer, camera); const hit = ray.intersectObjects([...contacts, ...somas, ...lines], false)[0];
      if (hit?.object.userData.contact !== undefined) current.current.onContact(hit.object.userData.contact);
      else if (hit?.object.userData.fiber !== undefined) current.current.onFiber(hit.object.userData.fiber);
    };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up);
    const resize = new ResizeObserver(() => { if (!host.current) return; const w = host.current.clientWidth, h = host.current.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    resize.observe(host.current);
    let frame;
    const render = () => {
      const p = current.current;
      contacts.forEach((c, i) => { c.scale.setScalar(i === p.selectedContact ? 1.6 : 1); c.material.color.set(geometry.contacts[i].active ? (i === p.selectedContact ? '#dcad58' : '#a68851') : '#666763'); });
      lines.forEach((line, i) => {
        const fiber = p.fibers?.[i], colors = line.geometry.attributes.color;
        for (let c = 0; c < model.compartmentCount; c++) {
          const rgb = fiber?.alive === false ? [100, 100, 95] : voltageColor(replayValue(fiber, c, p.timeMs));
          colors.setXYZ(c, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
        }
        colors.needsUpdate = true; line.material.opacity = geometry.fibers[i].alive ? (i === p.selectedFiber ? 1 : .60) : .15;
        somas[i].material.color.setRGB(...voltageColor(replayValue(fiber, model.somaIndex, p.timeMs)).map(v => v / 255));
        somas[i].scale.setScalar(i === p.selectedFiber ? 1.7 : 1);
      });
      controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(render);
    };
    render(); state.current = { renderer, controls, scene };
    return () => { cancelAnimationFrame(frame); resize.disconnect(); controls.dispose(); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up); scene.traverse(x => { x.geometry?.dispose(); if (Array.isArray(x.material)) x.material.forEach(m => m.dispose()); else x.material?.dispose(); }); renderer.dispose(); renderer.domElement.remove(); state.current = null; };
  }, [geometry, model, theme]);
  return <div ref={host} class="coch-three" />;
}

function useWidth() {
  const ref = useRef(null), [width, setWidth] = useState(700);
  useEffect(() => { if (!ref.current) return; const observer = new ResizeObserver(entries => setWidth(Math.max(260, entries[0].contentRect.width))); observer.observe(ref.current); return () => observer.disconnect(); }, []);
  return [ref, width];
}

function CalculationSpace({ geometry, model, fibers, timeMs, selectedContact, selectedFiber, onContact, onFiber }) {
  const [ref, width] = useWidth(), height = 390, left = 46, right = width - 22, top = 35, bottom = 346;
  const x = place => left + place / 35 * (right - left), y = p => top + (p + 1.5) / 13.5 * (bottom - top);
  const ticks = width < 460 ? [0, 10, 20, 35] : [0, 5, 10, 15, 20, 25, 30, 35];
  return <div ref={ref} class="coch-flat"><svg role="img" aria-label="Unrolled electrical calculation space in millimeters, with 65-compartment nerve fibers and electrode projections" viewBox={`0 0 ${width} ${height}`}>
    <rect x={left} y={top} width={right - left} height={bottom - top} fill="none" stroke="var(--coch-rule)" />
    {ticks.map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1={top} y2={bottom} stroke="var(--coch-rule)" opacity=".35" /><text x={x(t)} y={bottom + 17} text-anchor="middle">{t}</text></g>)}
    {[0, 3, 6, 9, 12].map(t => <g key={t}><text x={left - 8} y={y(t) + 4} text-anchor="end">{t}</text><line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke="var(--coch-rule)" opacity=".3" /></g>)}
    {geometry.fibers.map((fiber, i) => <g key={i} onClick={() => onFiber(i)} class="coch-mark">
      <line x1={x(fiber.placeMm)} x2={x(fiber.placeMm)} y1={top} y2={bottom} stroke="transparent" stroke-width="12" />
      {Array.from(model.positionsMm).slice(1).map((p, c) => <line key={c} x1={x(fiber.placeMm)} x2={x(fiber.placeMm)} y1={y(model.positionsMm[c])} y2={y(p)} stroke={fiber.alive ? `rgb(${voltageColor(replayValue(fibers?.[i], c, timeMs)).join(',')})` : 'var(--coch-rule)'} stroke-width={i === selectedFiber ? 3.5 : 1.6} stroke-dasharray={fiber.alive ? null : '2 3'} />)}
      <circle cx={x(fiber.placeMm)} cy={y(model.positionsMm[model.somaIndex])} r={i === selectedFiber ? 5 : 3} fill={fiber.alive ? `rgb(${voltageColor(replayValue(fibers?.[i], model.somaIndex, timeMs)).join(',')})` : 'var(--coch-rule)'} />
    </g>)}
    <line x1={x(geometry.basalMm)} x2={x(geometry.apicalMm)} y1={y(0)} y2={y(0)} stroke="var(--coch-brass)" stroke-width="2" />
    {geometry.contacts.map((contact, i) => <g key={i} class="coch-mark" onClick={() => onContact(i)}><rect x={x(contact.positionMm[0]) - 11} y={y(0) - 14} width="22" height="28" fill="transparent" /><rect x={x(contact.positionMm[0]) - (i === selectedContact ? 5 : 3)} y={y(0) - 5} width={i === selectedContact ? 10 : 6} height="10" fill={contact.active ? 'var(--coch-brass)' : 'var(--coch-rule)'} stroke={i === selectedContact ? 'var(--coch-ink)' : 'none'} /></g>)}
    <text x={(left + right) / 2} y={height - 6} text-anchor="middle">Reference place from base / mm</text>
    <text x="13" y={(top + bottom) / 2} transform={`rotate(-90 13 ${(top + bottom) / 2})`} text-anchor="middle">Distance along nerve / mm</text>
    <text x={left + 8} y="18">Contact projections · z = {geometry.contacts[0].positionMm[2].toFixed(2)} mm</text>
  </svg></div>;
}

function FieldView({ geometry, settings, selectedContact }) {
  const ref = useRef(null), [range, setRange] = useState(0);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const slice = fieldSlice(geometry, settings, selectedContact, 150, 64); setRange(slice.maxAbs);
    canvas.width = slice.width; canvas.height = slice.height; const context = canvas.getContext('2d'), image = context.createImageData(slice.width, slice.height);
    for (let i = 0; i < slice.values.length; i++) {
      const t = slice.values[i] / Math.max(1e-12, slice.maxAbs), a = Math.sqrt(Math.abs(t));
      const base = [237, 233, 223], end = t >= 0 ? [153, 94, 43] : [48, 98, 132];
      for (let c = 0; c < 3; c++) image.data[4 * i + c] = Math.round(base[c] + a * (end[c] - base[c])); image.data[4 * i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }, [geometry, settings, selectedContact]);
  return <div class="coch-field-view"><div class="coch-field-axis">Nerve plane z = 0 · y = −2 to +4 mm</div><canvas ref={ref} role="img" aria-label={`Extracellular potential gain from contact ${selectedContact + 1} and its return configuration, in millivolts per microampere`} /><div class="coch-field-axis"><span>Base · x = 0 mm</span><span>Apex · x = 35 mm</span></div><div class="coch-field-scale"><span>−{range.toFixed(3)}</span><i /><span>+{range.toFixed(3)} mV / µA</span></div><p>Signed unit-current potential, including the return. The leading cathodic phase reverses its sign. Scale updates per view.</p></div>;
}

export default function CochleaScene(props) {
  return props.view === 'field' ? <FieldView {...props} /> : props.view === 'unrolled' ? <CalculationSpace {...props} /> : <CoiledScene {...props} />;
}
