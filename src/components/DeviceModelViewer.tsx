import { useEffect, useRef, useState } from 'preact/hooks';
import { getDeviceModel, getContactGeometry, exportGeometry } from '../lib/devices/catalog.js';

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
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!model || !mount.current) return;
    let cancelled = false, cleanup = () => {};
    setReady(false); setOnlyContacts(false); setStatus('Loading 3D viewer…');
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
      renderer.setClearColor(0x101925); renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-label', `${model.name}. Interactive 3D model; use the view buttons for keyboard navigation.`);
      renderer.domElement.setAttribute('role', 'img');
      host.append(renderer.domElement);
      const scene = new THREE.Scene();
      const { group, bodies } = buildDeviceMesh(model);
      scene.add(group);
      scene.add(software ? new THREE.AmbientLight(0xffffff, 0.55) : new THREE.HemisphereLight(0xe2f3ff, 0x596479, 3));
      const key = new THREE.DirectionalLight(0xffffff, software ? 0.9 : 4); key.position.set(-4, -7, 10); scene.add(key);
      const fill = new THREE.DirectionalLight(0x78bfff, software ? 0.4 : 2); fill.position.set(5, 5, 2); scene.add(fill);
      const bounds = new THREE.Box3().setFromObject(group);
      const center = bounds.getCenter(new THREE.Vector3());
      const extent = bounds.getSize(new THREE.Vector3()).length();
      const sites = getContactGeometry(model);
      const camera = new THREE.PerspectiveCamera(38, 1, 0.0001, 500);
      camera.up.set(0, 0, 1);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false; controls.minDistance = 0.04; controls.maxDistance = extent * 10;
      const gridSize = ['stentrode', 'neuralink'].includes(model.kind) ? 60 : 12;
      const grid = new THREE.GridHelper(gridSize, gridSize, 0x516071, 0x293645);
      grid.rotation.x = Math.PI / 2; grid.position.z = bounds.min.z - 0.02;
      scene.add(grid);
      const render = () => renderer.render(scene, camera);
      // Detail is a camera crop, not an enlarged or distorted shank.
      const defaultView = model.kind === 'neuropixels' ? 'tip' : 'oblique';
      let view = defaultView;
      const setView = (next: string) => {
        if (next === 'default') next = defaultView;
        view = next;
        const isTip = next === 'tip', isDetail = ['tip', 'detail', 'thread'].includes(next);
        const target = center.clone();
        let distance = extent / (2 * Math.tan(19 * Math.PI / 180)) * 1.12;
        let direction = new THREE.Vector3(0.8, -1.3, 0.85).normalize();
        if (model.kind === 'stentrode') direction.set(1, 0.27, 0.18).normalize();
        if (model.kind === 'neuralink') direction.set(0.6, 1.2, 1.4).normalize();
        if (next === 'front') direction.set(0, -1, 0);
        if (next === 'side') direction.set(1, 0, 0);
        if (next === 'end') {
          direction.set(0, -0.0001, 1).normalize();
          if (model.kind === 'stentrode') distance = Math.max(model.diameter * 1.7, bounds.max.z - center.z + model.diameter);
        }
        if (isTip) { target.set(0, 0, model.length - 0.28); distance = 0.9; direction.set(0, -1, 0); }
        if (next === 'detail' && model.kind === 'connexus') { target.set(0, 0, 1.15); distance = 2.8; }
        if (next === 'detail' && model.kind === 'stentrode') {
          const site = sites[8]; target.fromArray(site.positionMm);
          direction.fromArray(site.normal); distance = 2.8;
        }
        if (model.kind === 'neuralink' && (next === 'thread' || next === 'detail')) {
          const site = sites[model.sitesPerThread * Math.floor(model.threadCount / 2) + 7];
          target.fromArray(site.positionMm); direction.set(0, -0.0001, 1).normalize();
          distance = next === 'thread' ? 5.5 : 0.38;
        }
        distance /= Math.min(camera.aspect, 1);
        camera.position.copy(target).addScaledVector(direction, distance);
        controls.target.copy(target); controls.update(); render();
        const hint = isDetail ? 'Detail view · camera crop only; physical dimensions unchanged · drag to rotate' : `Drag to rotate · scroll or pinch to zoom · grid spacing 1 mm${model.kind === 'neuralink' ? ' · unfurled display pose' : ''}`;
        setStatus(`${software ? 'Software rendering · ' : ''}${hint}`);
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
      api.current = { setView, contacts: (value: boolean) => { bodies.visible = !value; render(); }, zoom: (factor: number) => {
        const delta = camera.position.clone().sub(controls.target).multiplyScalar(factor);
        delta.clampLength(controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).add(delta); controls.update(); render();
      }, export: async () => {
        const { exportDeviceGlb } = await import('../lib/devices/export.js');
        const result = await exportDeviceGlb(group);
        download(result as ArrayBuffer, `${model.id}.glb`, 'model/gltf-binary');
      } };
      cleanup = () => {
        api.current = null; observer.disconnect(); controls.dispose();
        renderer.domElement.removeEventListener('webglcontextlost', contextLost);
        disposeDeviceMesh(group); disposeDeviceMesh(grid); renderer.dispose?.(); renderer.domElement.remove();
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
    <div class="model-heading"><span class="model-kicker">3D GEOMETRY · REFERENCE MODEL</span><h3>{model.name}</h3><p>Electrode-bearing structure · dimensions in millimeters</p></div>
    <div ref={mount} class="model-canvas" />
    <p class="model-status" role="status">{status}</p>
    <div class="model-controls" aria-label="Model controls">
      <button disabled={!ready} onClick={() => api.current?.setView('default')}>Reset view</button>
      <button disabled={!ready} onClick={() => api.current?.setView('front')}>Front</button>
      <button disabled={!ready} onClick={() => api.current?.setView('side')}>Side</button>
      {model.kind === 'stentrode' && <button disabled={!ready} onClick={() => api.current?.setView('end')}>End-on</button>}
      {['connexus', 'neuralink'].includes(model.kind) && <button disabled={!ready} onClick={() => api.current?.setView('end')}>{model.kind === 'connexus' ? 'Electrode face' : 'Top view'}</button>}
      {model.kind === 'neuralink' && <button disabled={!ready} onClick={() => api.current?.setView('thread')}>Thread detail</button>}
      {['connexus', 'neuralink', 'stentrode'].includes(model.kind) && <button disabled={!ready} onClick={() => api.current?.setView('detail')}>{model.kind === 'connexus' ? 'Microwire detail' : 'Contact detail'}</button>}
      {model.kind === 'neuropixels' && <button disabled={!ready} onClick={() => api.current?.setView('oblique')}>Full shank</button>}
      {model.kind === 'neuropixels' && <button disabled={!ready} onClick={() => api.current?.setView('tip')}>Tip detail</button>}
      <button disabled={!ready} onClick={() => api.current?.zoom(0.7)} aria-label="Zoom in">Zoom +</button>
      <button disabled={!ready} onClick={() => api.current?.zoom(1.4)} aria-label="Zoom out">Zoom −</button>
      <button disabled={!ready} aria-pressed={onlyContacts} onClick={() => { const value = !onlyContacts; setOnlyContacts(value); api.current?.contacts(value); }}>Contacts only</button>
    </div>
    <div class="model-specs">{model.specs.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <p class="model-note"><strong>Model fidelity.</strong> {model.notes}</p>
    <div class="model-controls">
      <button onClick={() => download(JSON.stringify(exportGeometry(model), null, 2), `${model.id}.json`, 'application/json')}>Download geometry JSON</button>
      <button disabled={!ready || exporting} onClick={async () => { setExporting(true); try { await api.current?.export(); } catch { setStatus('GLB export failed. Try geometry JSON or reload the viewer.'); } finally { setExporting(false); } }}>{exporting ? 'Exporting…' : 'Download 3D model (.glb)'}</button>
    </div>
    <details class="model-sources"><summary>Sources &amp; reference images</summary>
      <p>Dimensions come from the linked specifications; images guide shape only. Reference images remain on their owners’ websites.</p>
      <ul>{[...model.sources, ...model.references].map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>)}</ul>
      <p>JSON includes physical site coordinates, unknown channel mappings and approximation notes. GLB uses meters. These models do not predict recording or stimulation performance.</p>
    </details>
    <style>{`
      .device-model{margin:24px 0;padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--panelStrong);overflow:hidden}
      .model-heading h3{font-size:1.45rem;margin:8px 0}.model-heading p{opacity:.75;margin:0 0 16px}.model-kicker{font-size:11px;letter-spacing:.14em;opacity:.7}
      .model-canvas{height:400px;width:100%;border-radius:10px;overflow:hidden;background:#101925;touch-action:none}.model-canvas canvas,.model-canvas svg{display:block;width:100%;height:100%}
      .model-status{font-size:12px;opacity:.8;min-height:2em}.model-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
      .model-controls button{font:inherit;font-size:13px;color:inherit;background:var(--panel);border:1px solid var(--border);padding:9px 12px;border-radius:9px;cursor:pointer}.model-controls button:disabled{opacity:.45;cursor:default}
      .model-controls button[aria-pressed=true]{border-color:currentColor}.model-controls button:focus-visible,.model-sources summary:focus-visible{outline:2px solid currentColor;outline-offset:3px}
      .model-specs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--border);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin:18px 0}
      .model-specs>div{padding:12px;background:var(--panel)}.model-specs span{display:block;font-size:12px;opacity:.72;margin-bottom:6px}.model-specs strong{font-size:14px;font-weight:500}
      .model-note,.model-sources{font-size:13px;line-height:1.65}.model-note{opacity:.85}.model-sources{margin-top:18px}.model-sources summary{cursor:pointer}.model-sources a{color:inherit;text-decoration:underline}.model-sources li{margin:7px 0}
      @media(max-width:600px){.device-model{padding:12px}.model-canvas{height:320px}.model-specs{grid-template-columns:1fr}}
    `}</style>
  </section>;
}
