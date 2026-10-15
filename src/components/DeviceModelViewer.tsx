import { useEffect, useRef, useState } from 'preact/hooks';
import { implantedKinds } from '../lib/devices/implant-contacts.js';
import { getDeviceModel, getContactGeometry, exportGeometry } from '../lib/devices/catalog.js';
import { MODEL_FOV, modelView, modelScaleBar, niceLength, formatModelLength } from '../lib/devices/model-view.js';

function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DeviceModelViewer({ deviceId }: { deviceId: string }) {
  const model = getDeviceModel(deviceId);
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<any>(null);
  const [status, setStatus] = useState('Loading 3D viewer…');
  const [ready, setReady] = useState(false);
  const [onlyContacts, setOnlyContacts] = useState(false);
  const [highlightContacts, setHighlightContacts] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [shellCutaway, setShellCutaway] = useState(false);
  const [viewLabel, setViewLabel] = useState('Overview');
  const [scale, setScale] = useState({ pixels: 0, label: '' });

  useEffect(() => {
    if (!model || !mount.current) return;
    let cancelled = false, cleanup = () => {};
    setReady(false); setOnlyContacts(false); setHighlightContacts(false); setShowGrid(false); setShellCutaway(false); setStatus('Loading 3D viewer…');
    (async () => {
      const [THREE, { OrbitControls }, { buildDeviceMesh, disposeDeviceMesh }] = await Promise.all([
        import('three'), import('three/addons/controls/OrbitControls.js'), import('../lib/devices/geometry.js'),
      ]);
      if (cancelled || !mount.current) return;
      const host = mount.current;
      let renderer: any, software = false;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      } catch {
        // Preserve inspection and exports on browsers with GPU rendering disabled.
        const { SVGRenderer } = await import('three/addons/renderers/SVGRenderer.js');
        if (cancelled || !mount.current) return;
        renderer = new SVGRenderer(); renderer.overdraw = 0; renderer.setPrecision(3);
        software = true;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x101419); renderer.outputColorSpace = THREE.SRGBColorSpace;
      if (!software) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.localClippingEnabled = true; }
      renderer.domElement.setAttribute('aria-label', `${model.name}. Interactive 3D model; use the view buttons for keyboard navigation.`);
      renderer.domElement.setAttribute('role', 'img');
      host.append(renderer.domElement);
      cleanup = () => { renderer.dispose?.(); renderer.domElement.remove(); };
      const scene = new THREE.Scene();
      const { group, bodies, contacts } = buildDeviceMesh(model);
      scene.add(group);
      let environment: any;
      cleanup = () => { disposeDeviceMesh(group); environment?.dispose(); renderer.dispose?.(); renderer.domElement.remove(); };
      if (!software) {
        // A neutral photographic studio gives metals broad reflections and keeps
        // dark contact coatings legible without changing their measured geometry.
        const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
        if (cancelled) return;
        const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
        environment = pmrem.fromScene(room, 0.04);
        scene.environment = environment.texture; scene.environmentIntensity = 0.8;
        room.dispose(); pmrem.dispose();
      }
      // SVGRenderer uses ambient color directly rather than ambient intensity.
      scene.add(software ? new THREE.AmbientLight(0x999999) : new THREE.HemisphereLight(0xe6edf5, 0x75808b, 0.7));
      const key = new THREE.DirectionalLight(0xfff5e9, software ? 0.8 : 2.2); key.position.set(-4, -7, 10); scene.add(key);
      const fill = new THREE.DirectionalLight(0xc9ddf2, software ? 0.35 : 0.8); fill.position.set(5, 4, 3); scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffffff, software ? 0.2 : 1.4); rim.position.set(-2, 5, 7); scene.add(rim);
      const bounds = new THREE.Box3().setFromObject(group);
      const center = bounds.getCenter(new THREE.Vector3());
      const extent = bounds.getSize(new THREE.Vector3()).length();
      const viewBounds = { min: bounds.min.toArray(), max: bounds.max.toArray() };
      const sites = getContactGeometry(model);
      const camera = new THREE.PerspectiveCamera(MODEL_FOV, 1, 0.0001, 500);
      camera.up.set(0, 0, 1);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false; controls.minDistance = 0.001; controls.maxDistance = extent * 12;
      controls.zoomSpeed = 0.85; controls.rotateSpeed = 0.75; controls.screenSpacePanning = true;
      const gridStep = niceLength(extent / 7), gridSize = gridStep * 20;
      const grid = new THREE.GridHelper(gridSize, 20, 0x4b5865, 0x2a333c);
      grid.rotation.x = Math.PI / 2; grid.position.set(center.x, center.y, bounds.min.z - extent * 0.025);
      grid.visible = false;
      const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
      gridMaterials.forEach(material => { material.transparent = true; material.opacity = 0.5; material.depthWrite = false; });
      if (software) gridMaterials.forEach(material => { material.vertexColors = false; material.color.setHex(0x293645); });
      scene.add(grid);
      const originalMaterials = new Map<any, any>(), highlightedMaterials = new Map<any, any>();
      const bodyMaterials = new Map<any, any>(), cutawayMaterials = new Map<any, any>();
      contacts.traverse((object: any) => { if (object.isMesh) originalMaterials.set(object, object.material); });
      bodies.traverse((object: any) => { if (object.isMesh) bodyMaterials.set(object, object.material); });
      const cutShell = (enabled: boolean) => {
        const clipped = (material: any) => {
          if (!cutawayMaterials.has(material)) {
            const copy = material.clone(); copy.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
            cutawayMaterials.set(material, copy);
          }
          return cutawayMaterials.get(material);
        };
        bodyMaterials.forEach((material, object) => { object.material = enabled && !software ? Array.isArray(material) ? material.map(clipped) : clipped(material) : material; });
        if (enabled && software) { bodies.visible = false; setOnlyContacts(true); }
      };
      const highlight = (enabled: boolean) => {
        const highlighted = (material: any) => {
          if (!highlightedMaterials.has(material)) {
            const copy = material.clone(); copy.color.setHex(0xe3b65e); copy.metalness = 0.15; copy.roughness = 0.42;
            copy.emissive?.setHex(0xb58129); copy.emissiveIntensity = 0.28;
            highlightedMaterials.set(material, copy);
          }
          return highlightedMaterials.get(material);
        };
        originalMaterials.forEach((material, object) => { object.material = enabled ? Array.isArray(material) ? material.map(highlighted) : highlighted(material) : material; });
      };
      const render = () => {
        const dist = camera.position.distanceTo(controls.target);
        camera.near = Math.max(0.0000001, dist * 0.01); camera.far = dist + extent * 4;
        camera.updateProjectionMatrix(); renderer.render(scene, camera);
        const nextScale = modelScaleBar(dist, host.clientHeight);
        setScale(previous => previous.label === nextScale.label && Math.abs(previous.pixels - nextScale.pixels) < 0.2 ? previous : nextScale);
      };
      let view = 'default';
      const setView = (next: string) => {
        if (next === 'default') { bodies.visible = true; setOnlyContacts(false); }
        cutShell(next === 'cutaway'); setShellCutaway(next === 'cutaway');
        if (next === 'cutaway' && !software) { bodies.visible = true; setOnlyContacts(false); }
        const preset = modelView(model, viewBounds, sites, next, camera.aspect);
        if (preset.cutaway) { bodies.visible = false; setOnlyContacts(true); }
        view = next;
        camera.up.fromArray(preset.up);
        controls.target.fromArray(preset.target);
        camera.position.copy(controls.target).addScaledVector(new THREE.Vector3().fromArray(preset.direction), preset.distance);
        controls.update(); render(); setViewLabel(next === 'cutaway' && software ? 'Contacts only' : preset.label);
        const hint = next === 'cutaway' ? software ? 'Software view: shell hidden to reveal contacts.' : 'Front half of shell hidden to reveal the lumen; contact positions are unchanged.' : preset.cutaway ? 'Cuff shell hidden to reveal inward-facing contacts.' : preset.detail ? 'Camera detail; dimensions and proportions are preserved.' : model.kind === 'neuralink' ? 'Unfurled display pose.' : 'Dimensions and proportions are preserved.';
        setStatus(`${software ? 'Software rendering · ' : ''}${hint} Drag to rotate · scroll or pinch to zoom`);
      };
      const resize = () => {
        const width = host.clientWidth, height = host.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); setView(view);
      };
      const observer = new ResizeObserver(resize); observer.observe(host);
      controls.addEventListener('change', render);
      const contextLost = (event: Event) => { event.preventDefault(); setReady(false); setStatus('3D graphics were interrupted. Reload to retry; dimensions and JSON export remain available.'); };
      renderer.domElement.addEventListener('webglcontextlost', contextLost);
      api.current = { setView,
        contacts: (value: boolean) => { bodies.visible = !value; render(); },
        highlight: (value: boolean) => { highlight(value); render(); },
        grid: (value: boolean) => { grid.visible = value; render(); setStatus(`${value ? `Grid spacing ${formatModelLength(gridStep)} · ` : ''}Drag to rotate · scroll or pinch to zoom`); },
        zoom: (factor: number) => {
          const delta = camera.position.clone().sub(controls.target).multiplyScalar(factor);
          delta.clampLength(controls.minDistance, controls.maxDistance);
          camera.position.copy(controls.target).add(delta); controls.update(); render();
        },
      };
      cleanup = () => {
        api.current = null; observer.disconnect(); controls.dispose();
        renderer.domElement.removeEventListener('webglcontextlost', contextLost);
        highlight(false); cutShell(false); highlightedMaterials.forEach(material => material.dispose()); cutawayMaterials.forEach(material => material.dispose());
        disposeDeviceMesh(group); disposeDeviceMesh(grid); environment?.dispose(); renderer.dispose?.(); renderer.domElement.remove();
      };
      resize(); setReady(true);
    })().catch(() => {
      cleanup();
      if (!cancelled) { setReady(false); setStatus('3D is unavailable in this browser. Published dimensions, reference links and geometry JSON are still available.'); }
    });
    return () => { cancelled = true; cleanup(); };
  }, [deviceId]);

  if (!model) return null;
  return <section class="device-model" id="model-3d" aria-label="3D device geometry">
    <div class="model-heading"><span class="model-kicker">3D GEOMETRY · REFERENCE MODEL</span><h3>{model.name}</h3><p>{model.modeledScope ?? (model.kind === 'chip-envelope' ? 'Package envelope only' : model.id === 'neuropixels-opto-electrical-window' ? 'Electrical crop only; optics omitted' : 'Electrode-bearing structure')} · dimensions in millimeters</p></div>
    <div class="model-stage">
      <div ref={mount} class="model-canvas" />
      <div class="model-view-label" aria-hidden="true"><span />{viewLabel}</div>
      {ready && <div class="model-scale" aria-label={`${scale.label} at the focus plane`}><strong>{scale.label}</strong><span style={{ width: `${scale.pixels}px` }} /><small>At focus plane</small></div>}
      <span class="model-stage-note" aria-hidden="true">Rotate · Zoom · Inspect</span>
    </div>
    <p class="model-status" role="status">{status}</p>
    <div class="model-controls" aria-label="Model controls">
      <button disabled={!ready} onClick={() => api.current?.setView('default')}>Reset view</button>
      <button disabled={!ready} onClick={() => api.current?.setView('front')}>{model.kind === 'surface-grid' ? 'Contact face' : 'Front'}</button>
      <button disabled={!ready} onClick={() => api.current?.setView('side')}>{model.kind === 'surface-grid' ? 'Low angle' : 'Side'}</button>
      {model.kind === 'surface-grid' && <button disabled={!ready} onClick={() => api.current?.setView('oblique')}>Full patch</button>}
      {['carbon-row', 'cylindrical-lead', 'exposed-wire'].includes(model.kind) && <button disabled={!ready} onClick={() => api.current?.setView('oblique')}>Full structure</button>}
      {['nerve-cuff', 'flat-cuff'].includes(model.kind) && <button disabled={!ready} aria-pressed={shellCutaway} onClick={() => api.current?.setView(shellCutaway ? 'default' : 'cutaway')}>Shell cutaway</button>}
      {['stentrode', 'cylindrical-lead', 'nerve-cuff', 'flat-cuff', 'exposed-wire'].includes(model.kind) && <button disabled={!ready} onClick={() => api.current?.setView('end')}>End-on</button>}
      {['connexus', 'neuralink'].includes(model.kind) && <button disabled={!ready} onClick={() => api.current?.setView('end')}>{model.kind === 'connexus' ? 'Electrode face' : 'Top view'}</button>}
      {model.kind === 'neuralink' && <button disabled={!ready} onClick={() => api.current?.setView('thread')}>Thread detail</button>}
      {['connexus', 'neuralink', 'stentrode', 'carbon-row', 'surface-grid', 'neuropixels', 'planar-probe', 'cylindrical-lead', 'nerve-cuff', 'flat-cuff', 'exposed-wire'].includes(model.kind) && <button disabled={!ready} onClick={() => api.current?.setView('detail')}>{model.kind === 'connexus' ? 'Microwire detail' : 'Contact detail'}</button>}
      {['neuropixels', 'planar-probe'].includes(model.kind) && <button disabled={!ready} onClick={() => api.current?.setView('oblique')}>Full shank</button>}
      {['neuropixels', 'planar-probe'].includes(model.kind) && <button disabled={!ready} onClick={() => api.current?.setView('tip')}>Tip detail</button>}
      <button disabled={!ready} onClick={() => api.current?.zoom(0.7)} aria-label="Zoom in">Zoom +</button>
      <button disabled={!ready} onClick={() => api.current?.zoom(1.4)} aria-label="Zoom out">Zoom −</button>
      <button disabled={!ready || model.physicalSites === 0} aria-pressed={highlightContacts} onClick={() => { const value = !highlightContacts; setHighlightContacts(value); api.current?.highlight(value); }}>Highlight contacts</button>
      <button disabled={!ready} aria-pressed={showGrid} onClick={() => { const value = !showGrid; setShowGrid(value); api.current?.grid(value); }}>Scale grid</button>
      <button disabled={!ready || model.physicalSites === 0} aria-pressed={onlyContacts} onClick={() => { const value = !onlyContacts; setOnlyContacts(value); api.current?.contacts(value); }}>Contacts only</button>
    </div>
    <div class="model-specs">{model.specs.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {model.fidelity && <div class="model-evidence">{[['documented', 'Documented measurements'], ['reconstructed', 'Reconstructed or assumed'], ['omitted', 'Not modeled']].map(([key, label]) => <div><h4>{label}</h4><ul>{(model.fidelity[key] ?? []).map((item: string) => <li>{item}</li>)}</ul></div>)}</div>}
    <p class="model-note"><strong>Model fidelity.</strong> {model.notes}</p>
    <p class="model-finish-note">Color, transparency and surface finish approximate the references. Use Highlight contacts to inspect electrode locations.</p>
    <div class="model-controls">
      <button onClick={() => download(JSON.stringify(exportGeometry(model), null, 2), `${model.id}.json`, 'application/json')}>Download geometry JSON</button>
      <a class="model-download" href={`/models/devices/${model.id}.glb`} download>Download 3D model (.glb)</a>
    </div>
    {(model.kind === 'surface-grid' || (implantedKinds.has(model.kind) && model.kind !== 'exposed-wire')) && <p class="model-note">Contact meshes use a 10 nm display separation to prevent surface flicker in 3D exports. Geometry JSON retains the nominal measured surfaces.</p>}
    <details class="model-sources"><summary>Sources &amp; reference images</summary>
      <p>Dimensions come from the linked specifications; images guide shape only. Reference images remain on their owners’ websites.</p>
      <ul>{[...model.sources, ...model.references].map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} →</a></li>)}</ul>
      <p>JSON includes physical site coordinates, unknown channel mappings and approximation notes. GLB uses meters. These models do not predict recording or stimulation performance.</p>
    </details>
    <style>{`
      .device-model{margin:24px 0;padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--panelStrong);overflow:hidden}
      .model-heading h3{font-size:var(--title-card);margin:8px 0}.model-heading p{opacity:.75;margin:0 0 16px}.model-kicker{font-size:11px;letter-spacing:.14em;opacity:.7}
      .model-stage{position:relative;border:1px solid #2b343e;border-radius:14px;overflow:hidden;background:#101419;isolation:isolate}
      .model-canvas{height:clamp(430px,58vw,590px);width:100%;overflow:hidden;touch-action:none}.model-canvas canvas,.model-canvas svg{display:block;width:100%;height:100%}
      .model-view-label{position:absolute;top:18px;left:18px;display:flex;align-items:center;gap:8px;color:#d5dde5;font-size:12px;letter-spacing:.025em;pointer-events:none;background:#101419b3;padding:7px 10px;border:1px solid #c9d7e216;border-radius:6px}.model-view-label>span{width:5px;height:5px;border-radius:50%;background:#b7c6d4}
      .model-scale{position:absolute;bottom:20px;left:22px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;color:#e6edf3;pointer-events:none;text-shadow:0 1px 4px #000}.model-scale strong{font-size:12px;font-weight:500;font-variant-numeric:tabular-nums}.model-scale>span{height:6px;border-bottom:1px solid #d8e3ec;border-left:1px solid #d8e3ec;border-right:1px solid #d8e3ec;box-sizing:border-box}.model-scale small{font-size:10px;color:#8e9ba8}
      .model-stage-note{position:absolute;right:18px;bottom:20px;font-size:10px;letter-spacing:.08em;color:#71808e;pointer-events:none}
      .model-status{font-size:12px;opacity:.8;min-height:2em}.model-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
      .model-controls .model-download{font-size:13px;padding:9px 12px;border:1px solid var(--border);border-radius:9px;color:inherit;background:var(--panel);text-decoration:none}
      .model-controls button{font:inherit;font-size:13px;color:inherit;background:var(--panel);border:1px solid var(--border);padding:9px 12px;border-radius:9px;cursor:pointer}.model-controls button:disabled{opacity:.45;cursor:default}
      .model-controls button[aria-pressed=true]{border-color:#9cacc0;background:#71829820}.model-controls button:not(:disabled):hover,.model-controls .model-download:hover{border-color:#9cacc0;background:#71829815}.model-controls button:focus-visible,.model-sources summary:focus-visible{outline:2px solid currentColor;outline-offset:3px}
      .model-specs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--border);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin:18px 0}
      .model-specs>div{padding:12px;background:var(--panel)}.model-specs span{display:block;font-size:12px;opacity:.72;margin-bottom:6px}.model-specs strong{font-size:16px;font-weight:400}
      .model-evidence{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:16px 0}.model-evidence h4{font-size:14px;font-weight:400;font-style:italic;margin:0 0 8px}.model-evidence ul{padding-left:18px;margin:0;font-size:13px;line-height:1.6;opacity:.8}
      .model-note,.model-sources{font-size:16px;line-height:1.65}.model-note{opacity:.85}.model-sources{margin-top:18px}.model-sources summary{cursor:pointer}.model-sources a{color:inherit;text-decoration:underline}.model-sources li{margin:7px 0}
      .model-finish-note{font-size:13px;line-height:1.6;opacity:.7}
      @media(max-width:600px){.device-model{padding:12px}.model-canvas{height:410px}.model-stage-note{display:none}.model-view-label{top:12px;left:12px}.model-scale{left:16px;bottom:16px}.model-specs{grid-template-columns:1fr}}
    `}</style>
  </section>;
}
