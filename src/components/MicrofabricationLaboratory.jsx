import SimHero from './SimHero.jsx';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DEFAULT_CONFIG, STAGES, SCENARIOS, normalizeConfig, createExperiment } from '../lib/microfabrication/model.js';
import '../styles/microfabrication.css';

const STORAGE_KEY = 'bts-microfabrication-v1';
const MODEL_VERSION = 'microfabrication-1';
const fmt = (v, digits = 1) => Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
const COLORS = { silicon: '#65717c', polymer: '#a9bfca', cap: '#8aa8a2', metal: '#d6b356', resist: '#cd9d70', mask: '#b194ac' };
const layerColor = layer => layer.color || (/metal|conductor|gold/i.test(layer.id + layer.name) ? COLORS.metal : /resist|mask/i.test(layer.id + layer.name) ? COLORS.resist : /carrier|silicon/i.test(layer.id + layer.name) ? COLORS.silicon : COLORS.polymer);
const effectiveStage = state => state.process?.effectiveStage ?? state.stage;
const signature = (config, stage) => JSON.stringify([config, stage]);

function download(text, type, filename) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function maskPath(mask, nx, ny, cellUm) {
  let path = '';
  for (let y = 0; y < ny; y++) {
    let x = 0;
    while (x < nx) {
      while (x < nx && !mask[y * nx + x]) x++;
      const start = x;
      while (x < nx && mask[y * nx + x]) x++;
      if (x > start) path += `M${start * cellUm},${y * cellUm}h${(x - start) * cellUm}v${cellUm}h-${(x - start) * cellUm}z`;
    }
  }
  return path;
}

function runDocument(config, stage, state) {
  return {
    schema: MODEL_VERSION, savedAt: new Date().toISOString(), config, stage,
    process: STAGES.map((s, index) => ({ step: index, id: s.id, label: s.label, reached: index <= effectiveStage(state) })),
    measurements: state.measurements, channels: state.channels,
    assumptions: 'Generic four-channel layout; 2 µm in-plane raster; effective process parameters. Trace resistance uses the declared resistivity. No electrolyte impedance or implant-lifetime prediction.',
    references: ['https://buildthesimulation.com/simulations/microfabrication/methods/'],
  };
}

function Field({ name, label, unit = 'µm', min, max, step = 1, value, onChange }) {
  return <label class="mf-field"><span>{label}<small>{unit}</small></span>
    <input aria-label={`${label}${unit ? ` (${unit})` : ''}`} type="number" name={name} value={value} min={min} max={max} step={step}
      onChange={e => { const v = e.currentTarget.valueAsNumber; if (Number.isFinite(v)) onChange(name, Math.max(min, Math.min(max, v))); }} />
  </label>;
}

function TopView({ state, sectionY, setSectionY, selected, setSelected }) {
  const canvas = useRef(null);
  const bounds = useRef(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const draw = () => {
      const rect = el.getBoundingClientRect(), width = rect.width, height = rect.height;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      const ctx = el.getContext('2d'); ctx.scale(dpr, dpr);
      ctx.fillStyle = '#242725'; ctx.fillRect(0, 0, width, height);
      const { nx, ny, widthUm, heightUm } = state.geometry;
      const scale = Math.min((width - 56) / heightUm, (height - 100) / widthUm);
      const px = (width - heightUm * scale) / 2, py = (height - widthUm * scale) / 2;
      bounds.current = { px, py, scale };
      ctx.strokeStyle = '#373d38'; ctx.lineWidth = 1;
      for (let x = px; x < px + heightUm * scale + 1; x += 100 * scale) { ctx.beginPath(); ctx.moveTo(x, py - 20); ctx.lineTo(x, py + widthUm * scale + 20); ctx.stroke(); }
      for (let y = py; y < py + widthUm * scale + 1; y += 80 * scale) { ctx.beginPath(); ctx.moveTo(px - 12, y); ctx.lineTo(px + heightUm * scale + 12, y); ctx.stroke(); }
      for (const layer of state.layers) {
        if (!layer.mask || layer.thicknessUm <= 0) continue;
        const off = document.createElement('canvas'); off.width = nx; off.height = ny;
        const c = off.getContext('2d'), data = c.createImageData(nx, ny);
        const hex = layerColor(layer).replace('#', ''), color = parseInt(hex.length === 3 ? hex.split('').map(s => s + s).join('') : hex, 16);
        const alpha = /poly|base|encap|cap/i.test(layer.id + layer.name) ? 145 : 255;
        for (let i = 0; i < layer.mask.length; i++) if (layer.mask[i]) { data.data[i * 4] = (color >> 16) & 255; data.data[i * 4 + 1] = (color >> 8) & 255; data.data[i * 4 + 2] = color & 255; data.data[i * 4 + 3] = alpha; }
        c.putImageData(data, 0, 0);
        ctx.save(); ctx.translate(px, py); ctx.transform(0, scale, scale, 0, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, widthUm, heightUm); ctx.restore();
      }
      ctx.strokeStyle = '#89d1cd'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      const sx = px + sectionY * scale;
      ctx.beginPath(); ctx.moveTo(sx, py - 25); ctx.lineTo(sx, py + widthUm * scale + 25); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '12px sans-serif'; ctx.fillStyle = '#d7e9df'; ctx.textAlign = 'center';
      ctx.fillText('A', sx, py - 32); ctx.fillText('A′', sx, py + widthUm * scale + 42);
      for (const ch of state.channels) {
        const x = px + ch.siteYUm * scale, y = py + ch.xUm * scale;
        if (ch.id === selected) { ctx.strokeStyle = '#f4ead4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, (state.config.siteDiameterUm / 2 + 9) * scale, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = '#fff1d4'; ctx.fillText(String(ch.id), px + 45 * scale, y + 4);
      }
      ctx.textAlign = 'left'; ctx.fillStyle = '#d6d7c9'; ctx.fillText('TIP', px, py - 35);
      ctx.textAlign = 'right'; ctx.fillText('CONNECTOR', px + heightUm * scale, py - 35);
      ctx.strokeStyle = '#d6d7c9'; ctx.beginPath(); ctx.moveTo(px, height - 25); ctx.lineTo(px + 100 * scale, height - 25); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillText('100 µm', px, height - 35);
    };
    draw(); const observer = new ResizeObserver(draw); observer.observe(el); return () => observer.disconnect();
  }, [state, sectionY, selected]);
  return <canvas ref={canvas} class="mf-top-canvas" aria-label="Top view of the actual fabricated material masks. Click to move the cross-section." role="img" onClick={e => {
    const b = bounds.current; if (!b) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setSectionY(Math.max(0, Math.min(998, Math.round((e.clientX - rect.left - b.px) / b.scale / 2) * 2)));
    const x = (e.clientY - rect.top - b.py) / b.scale;
    const near = [...state.channels].sort((a, c) => Math.abs(a.xUm - x) - Math.abs(c.xUm - x))[0];
    if (near) setSelected(near.id);
  }} />;
}

function CrossSection({ state, yUm }) {
  const { nx, ny, cellUm, widthUm } = state.geometry;
  const row = Math.min(ny - 1, Math.max(0, Math.floor(yUm / cellUm)));
  const solids = state.layers.filter(l => l.thicknessUm > 0 && l.mask);
  const carrier = l => /carrier|silicon/i.test(l.id + l.name);
  const nonCarrier = solids.filter(l => !carrier(l));
  const bottom = nonCarrier.length ? Math.min(...nonCarrier.map(l => l.zUm)) : 0;
  const top = Math.max(bottom + 5, ...nonCarrier.map(l => l.zUm + l.thicknessUm));
  const zScale = Math.min(18, 120 / Math.max(5, top - bottom));
  const plot = { left: 42, right: 716, bottom: 162 };
  const rects = [];
  for (const layer of solids) {
    let x = 0;
    while (x < nx) {
      while (x < nx && !layer.mask[row * nx + x]) x++;
      const start = x;
      while (x < nx && layer.mask[row * nx + x]) x++;
      if (x === start) continue;
      const h = carrier(layer) ? 22 : Math.max(2, layer.thicknessUm * zScale);
      const y = carrier(layer) ? plot.bottom : plot.bottom - (layer.zUm - bottom) * zScale - h;
      rects.push(<rect key={`${layer.id}-${start}`} x={plot.left + start * cellUm / widthUm * (plot.right - plot.left)} y={y} width={(x - start) * cellUm / widthUm * (plot.right - plot.left)} height={h} fill={layerColor(layer)}><title>{layer.name}: {fmt(layer.thicknessUm, 3)} µm</title></rect>);
    }
  }
  return <div class="mf-section-scroll"><svg class="mf-section-svg" viewBox="0 0 760 224" role="img" aria-label={`Material cross-section at longitudinal position ${yUm} micrometers. Vertical dimensions enlarged; metal drawn at least two pixels.`}>
    <rect width="760" height="224" fill="#252927" />
    {[40, 80, 120, 160].map(y => <line key={y} x1="42" x2="716" y1={y} y2={y} stroke="#3c443e" strokeWidth=".6" />)}
    {rects}
    <line x1="42" x2="716" y1="196" y2="196" stroke="#849288" strokeWidth="1" />
    {[0, 80, 160, 240, 320].map(x => <g key={x}><line x1={42 + x / 320 * 674} x2={42 + x / 320 * 674} y1="192" y2="200" stroke="#b8c4ba" /><text x={42 + x / 320 * 674} y="215" textAnchor="middle" fill="#d7e3d9" fontSize="12">{x}</text></g>)}
    <text x="18" y="23" fill="#c6e2de" fontSize="13">A</text><text x="738" y="23" fill="#c6e2de" fontSize="13">A′</text>
    <text x="700" y="183" textAnchor="end" fill="#d7e3d9" fontSize="12">width / µm</text>
    {!nonCarrier.length && <text x="380" y="93" textAnchor="middle" fill="#d7e3d9" fontSize="15">Carrier prepared · no device films yet</text>}
  </svg></div>;
}

function ReferenceCard({ label, value, unit }) {
  return <div class="mf-readout"><span>{label}</span><div>{value}<small>{unit}</small></div></div>;
}

export default function MicrofabricationLaboratory() {
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG });
  const [stage, setStage] = useState(9);
  const [scenario, setScenario] = useState('baseline');
  const [sectionY, setSectionY] = useState(170);
  const [selected, setSelected] = useState(1);
  const [view, setView] = useState('device');
  const [exploded, setExploded] = useState(false);
  const [verticalScale, setVerticalScale] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [tested, setTested] = useState('');
  const [notice, setNotice] = useState('');
  const [storage, setStorage] = useState('');
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState('');
  const [sceneReady, setSceneReady] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [panel, setPanel] = useState('design');
  const host = useRef(null), scene = useRef(null), importInput = useRef(null);
  const experiment = useMemo(() => createExperiment(config, stage), [config, stage]);
  const currentSignature = signature(config, stage);
  const isTested = tested === currentSignature;
  const actualStage = effectiveStage(experiment);
  const blocked = Boolean(experiment.process?.blocked) || actualStage < stage;
  const channel = experiment.channels.find(c => c.id === selected) || experiment.channels[0];
  const activeStep = STAGES[actualStage] || STAGES[stage];
  const stateRef = useRef(null);
  stateRef.current = { experiment, view, exploded, verticalScale, sectionY, selected };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.schema === MODEL_VERSION && saved.config) {
        setConfig(normalizeConfig(saved.config)); setStage(Math.min(9, Math.max(0, Math.round(Number(saved.stage) || 0))));
        setScenario('custom'); setStorage('Previous run restored');
      }
    } catch { setStorage('Local saving is unavailable'); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: MODEL_VERSION, config, stage })); setStorage('Saved in this browser'); }
      catch { setStorage('Download your run to keep it'); }
    }, 500);
    return () => clearTimeout(timer);
  }, [config, stage, ready]);

  useEffect(() => {
    let disposed = false;
    import('../lib/microfabrication/scene.js').then(({ createFabricationScene }) => {
      if (disposed) return;
      try {
        scene.current = createFabricationScene(host.current, { onError: message => { setSceneError(String(message)); setView('mask'); }, onSelectChannel: setSelected });
        const s = stateRef.current;
        scene.current.update(s.experiment, { view: s.view === 'mask' ? 'device' : s.view, exploded: s.exploded, verticalScale: s.verticalScale, sectionYUm: s.sectionY, selectedChannel: s.selected });
        setSceneReady(true);
      } catch { setSceneError('3D is unavailable on this device. The mask view, cross-section and all measurements remain available.'); setView('mask'); }
    }).catch(() => { setSceneError('The 3D view could not load. Use Mask layout to inspect the same material geometry.'); setView('mask'); });
    return () => { disposed = true; scene.current?.dispose(); scene.current = null; };
  }, []);

  useEffect(() => {
    if (!scene.current) return;
    try { scene.current.update(experiment, { view: view === 'mask' ? 'device' : view, exploded, verticalScale, sectionYUm: sectionY, selectedChannel: selected }); }
    catch { setSceneError('The 3D view could not update. The mask and cross-section views remain available.'); setView('mask'); }
  }, [experiment, view, exploded, verticalScale, sectionY, selected, sceneReady]);

  useEffect(() => {
    if (!playing) return;
    if (stage >= 9 || blocked) { setPlaying(false); return; }
    const timer = setTimeout(() => setStage(s => Math.min(9, s + 1)), 1700);
    return () => clearTimeout(timer);
  }, [playing, stage, blocked]);

  const change = (key, value) => { setConfig(c => normalizeConfig({ ...c, [key]: value })); setScenario('custom'); setTested(''); setNotice('Recipe updated; the displayed process is recomputed.'); setPlaying(false); };
  const field = (name, label, min, max, step = 1, unit = 'µm') => <Field name={name} label={label} min={min} max={max} step={step} unit={unit} value={config[name]} onChange={change} />;
  const chooseScenario = id => {
    const preset = SCENARIOS.find(s => s.id === id);
    setConfig(normalizeConfig({ ...DEFAULT_CONFIG, ...(preset?.config || {}) })); setScenario(id); setStage(9); setTested(''); setPlaying(false); setNotice(preset?.description || 'Reference process loaded.');
    setSectionY(id === 'open' ? 528 : id === 'bridge' ? 560 : 170);
  };
  const replay = () => { if (playing) { setPlaying(false); return; } setStage(0); setTested(''); setPlaying(true); setNotice('Following the same recipe from carrier to released device.'); };
  const inspectStage = index => { setStage(index); setPlaying(false); setTested(''); setNotice(''); };
  const saveRun = () => { download(JSON.stringify(runDocument(config, stage, experiment), null, 2), 'application/json', 'microfabrication-run.json'); setNotice('Run downloaded with recipe, process history and computed measurements.'); };
  const importRun = async event => {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (!file) return;
    try {
      if (file.size > 1e6) throw Error('Choose a run file smaller than 1 MB.');
      const data = JSON.parse(await file.text());
      if (data.schema !== MODEL_VERSION || !data.config || typeof data.config !== 'object' || Array.isArray(data.config)) throw Error('This is not a Microfabrication Laboratory run.');
      setConfig(normalizeConfig(data.config)); setStage(Math.max(0, Math.min(9, Math.round(Number(data.stage) || 0)))); setScenario('custom'); setPlaying(false); setTested(''); setNotice('Run imported. All measurements are recomputed from its recipe.');
    } catch (error) { setNotice(`Import failed: ${error.message}`); }
  };
  const exportMask = () => {
    const { nx, ny, cellUm, widthUm, heightUm, designMetal, maskOpenings } = experiment.geometry;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(widthUm * 2 + 40) / 1000}mm" height="${heightUm / 1000}mm" viewBox="0 0 ${widthUm * 2 + 40} ${heightUm}"><title>Microfabrication teaching masks: intended metal at left, patterned contact-opening mask at right. 2 micrometer grid. Contact mask includes the configured alignment and effective edge bias; cleared cap geometry is not exported as a mask.</title><g id="metal-mask"><path fill="black" d="${maskPath(designMetal, nx, ny, cellUm)}"/></g><g id="opening-mask" transform="translate(${widthUm + 40} 0)"><path fill="black" d="${maskPath(maskOpenings, nx, ny, cellUm)}"/></g></svg>`;
    download(svg, 'image/svg+xml', 'microfabrication-masks.svg'); setNotice('Teaching masks downloaded at their modeled dimensions. These are not qualified production masks.');
  };
  const electricalTest = () => { setTested(currentSignature); setNotice('Continuity, isolation and trace resistance calculated from the retained conductor geometry.'); };
  const compare = () => { setComparison({ config: { ...config }, channels: experiment.channels.map(c => ({ ...c })), measurements: { ...experiment.measurements } }); setNotice('This completed specimen is pinned for comparison. Change the recipe, then run the electrical test again.'); };
  const scenarioName = scenario === 'custom' ? 'Custom process' : SCENARIOS.find(s => s.id === scenario)?.name || 'Reference process';
  const passes = experiment.channels.filter(c => c.connected && !c.shortedWith?.length && c.exposedAreaUm2 > 0).length;

  return <section class="mf" aria-label="Microfabrication Laboratory">
    <SimHero kicker="Fabrication series 01 / Flexible neural interfaces" title="Microfabrication Laboratory" intro="Build a neural electrode, one material layer at a time." links={[{ href: '/simulations/microfabrication/methods/', label: 'Process & model notes' }]} />
    <div class="mf-runbar"><div class="mf-run-select"><span class="mf-label">Experiment</span><select aria-label="Experiment scenario" value={scenario} onChange={e => chooseScenario(e.currentTarget.value)}>
      {scenario === 'custom' && <option value="custom">Custom process</option>}
      {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select></div><div class="mf-run-actions"><button onClick={saveRun}>Save run ↓</button><button onClick={() => importInput.current?.click()}>Import run</button><button onClick={exportMask}>Masks ↓</button><input ref={importInput} type="file" accept=".json,application/json" hidden onChange={importRun} /></div></div>

    <nav class="mf-traveler" aria-label="Fabrication process history">{STAGES.map((step, index) => <button key={step.id} class={`${index === actualStage ? 'is-active' : ''} ${index < actualStage ? 'is-complete' : ''}`} aria-current={index === actualStage ? 'step' : undefined} aria-label={`Step ${index + 1}: ${step.label}`} onClick={() => inspectStage(index)}><span class="mf-step-no">{String(index + 1).padStart(2, '0')}</span><span>{step.label}</span></button>)}</nav>

    <div class="mf-workbench">
      <aside class="mf-controls" aria-label="Process parameters">
        <div class="mf-panel-title"><span class="mf-label">Process recipe</span><span class="mf-draft-label">{scenarioName}</span></div>
        <div class="mf-control-tabs" role="tablist" aria-label="Recipe sections">{[['design', 'Masks'], ['films', 'Films'], ['process', 'Process']].map(([id, label]) => <button key={id} role="tab" id={`mf-tab-${id}`} aria-selected={panel === id} aria-controls={`mf-panel-${id}`} onClick={() => setPanel(id)}>{label}</button>)}</div>
        <div class="mf-control-body" role="tabpanel" id={`mf-panel-${panel}`} aria-labelledby={`mf-tab-${panel}`}>
          {panel === 'design' && <><h2>Pattern geometry</h2><p class="mf-note">Four independently routed sites. Dimensions are measured in the sample plane.</p>
            {field('siteDiameterUm', 'Metal site diameter', 16, 72, 2)}
            {field('openingDiameterUm', 'Contact opening', 8, 80, 2)}
            {field('traceWidthUm', 'Trace width', 4, 40, 2)}
            {field('pitchUm', 'Site pitch', 40, 80, 2)}
            <h3>Opening mask alignment</h3>
            {field('overlayXUm', 'Lateral offset X', -80, 80, 2)}
            {field('overlayYUm', 'Longitudinal offset Y', -80, 80, 2)}
            <p class="mf-note">Change an offset, then inspect the exposed metal at the contact row.</p>
          </>}
          {panel === 'films' && <><h2>Material stack</h2><p class="mf-note">Polyimide surrounds one effective conducting film. The carrier supports it until release.</p>
            {field('baseThicknessUm', 'Base polyimide', 2, 20, 1)}
            {field('metalThicknessNm', 'Metal thickness', 50, 1000, 25, 'nm')}
            {field('topThicknessUm', 'Top polyimide', 2, 20, 1)}
            {field('resistThicknessUm', 'Lift-off resist', .5, 8, .1)}
            {field('maskThicknessUm', 'Etch mask', .5, 15, .5)}
            <div class="mf-material-note"><span class="mf-label">Electrical assumption</span><p>Effective film resistivity: {fmt(config.effectiveResistivityOhmM * 1e8, 2)} × 10⁻⁸ Ω·m. Bulk-gold illustration; deposited films can differ.</p></div>
          </>}
          {panel === 'process' && <><h2>Effective process settings</h2><p class="mf-note">Geometric and rate inputs for this teaching model; see the process notes for their scope.</p>
            {field('lithographyBiasUm', 'Developed edge bias', -6, 6, 1)}
            {field('undercutUm', 'Resist undercut', 0, 6, .2)}
            {field('depositionAngleDeg', 'Deposition spread', 0, 45, 1, '°')}
            {field('etchTimeMin', 'Contact etch time', 0, 30, .5, 'min')}
            {field('etchRateUmMin', 'Polyimide etch rate', .1, 3, .1, 'µm/min')}
            {field('etchSelectivity', 'Polyimide : mask', 1, 10, .5, 'ratio')}
            {field('lateralRatio', 'Lateral : vertical etch', 0, .3, .01, 'ratio')}
          </>}
          <div class="mf-defect-control"><label class="mf-field"><span>Controlled defect<small>scenario</small></span><select aria-label="Controlled defect" value={config.defect} onChange={e => change('defect', e.currentTarget.value)}><option value="none">None</option><option value="open">Break in channel 1</option><option value="bridge">Bridge between channels</option><option value="pinhole">Insulation pinhole</option></select></label><p class="mf-note">A reproducible injected geometry defect, not a predicted failure probability.</p></div>
        </div>
      </aside>

      <div class="mf-observation">
        <div class="mf-stage-head"><div><span class="mf-label">{blocked ? 'Process stopped' : `Stage ${String(actualStage + 1).padStart(2, '0')}`}</span><h2>{activeStep?.station || activeStep?.label}</h2></div><div class="mf-stage-actions"><button aria-label="Previous fabrication step" disabled={actualStage === 0} onClick={() => inspectStage(actualStage - 1)}>←</button><button class="mf-play" onClick={replay}>{playing ? 'Pause' : 'Replay process'}</button><button aria-label="Next fabrication step" disabled={stage === 9 || blocked} onClick={() => inspectStage(stage + 1)}>→</button></div></div>
        <p class="mf-stage-description">{activeStep?.description}</p>
        <div class="mf-viewbar"><div class="mf-view-tabs" role="tablist" aria-label="Sample view">{[['device', '3D device'], ['mask', 'Mask layout'], ['wafer', 'Wafer layout']].map(([id, label]) => <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} disabled={Boolean(sceneError) && id !== 'mask'}>{label}</button>)}</div><button class="mf-camera" onClick={() => scene.current?.resetCamera()} disabled={view === 'mask' || Boolean(sceneError)}>Reset view</button></div>
        <div class="mf-viewport">
          <div ref={host} class="mf-scene" style={{ visibility: view === 'mask' ? 'hidden' : 'visible' }} aria-label="Interactive three-dimensional fabricated specimen" />
          {view === 'mask' && <div class="mf-mask-view"><TopView state={experiment} sectionY={sectionY} setSectionY={setSectionY} selected={selected} setSelected={setSelected} /></div>}
          {!sceneReady && !sceneError && view !== 'mask' && <p class="mf-loading" role="status">Preparing specimen…</p>}
          <div class="mf-scene-caption"><span>{view === 'wafer' ? 'Repeated current design · schematic placement' : view === 'mask' ? 'Click the sample to move section A–A′' : 'Drag to orbit · scroll or pinch to zoom'}</span><span>{stage === 9 && !blocked ? 'Released specimen' : 'Carrier-supported process'}</span></div>
        </div>
        <div class="mf-scene-options"><div class="mf-legend" aria-label="Material colors">{[['silicon','Silicon'],['polymer','Base PI'],['cap','Top PI'],['metal','Metal'],['resist','Resist'],['mask','Etch mask']].map(([color, label]) => <span key={color}><i style={{ background: COLORS[color] }} />{label}</span>)}</div><div class="mf-display-options"><label><input type="checkbox" checked={exploded} disabled={view === 'mask'} onChange={e => setExploded(e.currentTarget.checked)} />Separate layers</label><label>Height <select aria-label="Vertical display exaggeration" value={verticalScale} disabled={view === 'mask'} onChange={e => setVerticalScale(Number(e.currentTarget.value))}><option value="1">1×</option><option value="3">3×</option><option value="8">8×</option></select></label></div></div>
        <p class="mf-scale-note">Material colors and translucency aid inspection. Metal has a minimum visible display thickness; measurements use physical dimensions.</p>
        {sceneError && <p class="mf-alert" role="status">{sceneError}</p>}

        <section class="mf-section" aria-label="Live material cross-section"><div class="mf-section-heading"><div><span class="mf-label">Section A–A′</span><h3>Through the material stack</h3></div><label>Position <output>{fmt(sectionY, 0)} µm</output></label></div>
          <input class="mf-section-range" aria-label="Cross-section position in micrometers" type="range" min="0" max="998" step="2" value={sectionY} onInput={e => setSectionY(Number(e.currentTarget.value))} />
          <CrossSection state={experiment} yUm={sectionY} />
          <div class="mf-section-links"><button onClick={() => setSectionY(170)}>Electrode sites</button><button onClick={() => setSectionY(500)}>Routing</button><button onClick={() => setSectionY(900)}>Bond pads</button><span>Vertical dimensions enlarged</span></div>
        </section>
      </div>
    </div>

    <div class="mf-live-status" role="status" aria-live="polite"><span>{notice || (blocked ? 'Correct the lift-off settings before continuing this process.' : 'Select a process step, inspect a section, or change the recipe.')}</span><small>{storage}</small></div>

    <section class="mf-metrology" aria-labelledby="mf-metrology-title"><header><div><p class="mf-kicker">Inspection &amp; electrical probe station</p><h2 id="mf-metrology-title">Measure what you made</h2></div><div class="mf-run-actions"><button disabled={actualStage !== 9} class="mf-primary" onClick={electricalTest}>{isTested ? 'Repeat electrical test' : 'Run electrical test'}</button><button disabled={!isTested} onClick={compare}>Pin for comparison</button></div></header>
      <div class="mf-readouts"><ReferenceCard label="Current stack height" value={fmt(experiment.measurements.totalThicknessUm, 2)} unit="µm" /><ReferenceCard label="Exposed electrode area" value={fmt(experiment.measurements.exposedAreaUm2, 0)} unit="µm²" /><ReferenceCard label="Remaining cap in openings" value={fmt(experiment.measurements.capRemainingUm, 2)} unit="µm" /><ReferenceCard label="Continuous, isolated & exposed" value={isTested ? `${passes} / 4` : '—'} unit={isTested ? 'channels' : 'test after release'} /></div>
      <div class="mf-test-layout"><div class="mf-table-scroll"><table class="mf-channel-table"><caption>Channel measurements · select a row to inspect that channel</caption><thead><tr><th>Channel</th><th>Exposed area</th><th>Continuity</th><th>Isolation</th><th>Trace R</th></tr></thead><tbody>{experiment.channels.map(ch => <tr key={ch.id} class={selected === ch.id ? 'selected' : ''}><th><button aria-pressed={selected === ch.id} onClick={() => setSelected(ch.id)}>E{String(ch.id).padStart(2, '0')}</button></th><td>{fmt(ch.exposedAreaUm2, 0)} <small>µm²</small></td><td>{isTested ? ch.connected ? 'Connected' : 'Open' : '—'}</td><td>{isTested ? ch.shortedWith?.length ? `Short to ${ch.shortedWith.join(', ')}` : 'Isolated' : '—'}</td><td>{isTested ? fmt(ch.resistanceOhm, 2) : '—'} <small>Ω</small></td></tr>)}</tbody></table></div>
        <aside class="mf-channel-detail"><span class="mf-label">Selected channel {channel?.id}</span><h3>{isTested ? !channel?.connected ? 'Open conductor' : channel.shortedWith?.length ? 'Unintended connection' : channel.exposedAreaUm2 <= 0 ? 'Contact remains covered' : 'Continuous & isolated' : 'Inspect the geometry'}</h3><p>{isTested ? 'The probe station tests the retained metal. Exposure is the intersection of the site and a fully cleared insulation opening.' : 'Release the device and run the electrical test to check each channel. Surface exposure updates at every process step.'}</p>{channel && <dl><div><dt>Metal site area</dt><dd>{fmt(channel.nominalAreaUm2, 0)} µm²</dd></div><div><dt>Exposed fraction of site</dt><dd>{fmt(channel.exposureFraction * 100, 1)}%</dd></div><div><dt>Unintended exposed metal</dt><dd>{fmt(experiment.measurements.unintendedExposedAreaUm2, 0)} µm²</dd></div><div><dt>Mask reserve before strip</dt><dd>{fmt(experiment.measurements.maskRemainingUm, 2)} µm</dd></div></dl>}</aside>
      </div>
      <p class="mf-note">The channel count checks continuity, isolation and nonzero site exposure only. Inspect the process observations for unintended exposure or damaged insulation. Trace resistance excludes electrode–electrolyte impedance; biological performance and chronic reliability are outside this model.</p>
      {comparison && <section class="mf-comparison"><div class="mf-panel-title"><h3>Against your pinned specimen</h3><button onClick={() => setComparison(null)}>Clear comparison</button></div><div class="mf-table-scroll"><table><thead><tr><th>Channel</th><th>Pinned area</th><th>Current area</th><th>Area change</th><th>Pinned R</th><th>Current R</th></tr></thead><tbody>{experiment.channels.map((ch, i) => <tr key={ch.id}><th>E{ch.id}</th><td>{fmt(comparison.channels[i]?.exposedAreaUm2, 0)} µm²</td><td>{fmt(ch.exposedAreaUm2, 0)} µm²</td><td>{fmt(ch.exposedAreaUm2 - (comparison.channels[i]?.exposedAreaUm2 || 0), 0)} µm²</td><td>{fmt(comparison.channels[i]?.resistanceOhm, 2)} Ω</td><td>{isTested ? fmt(ch.resistanceOhm, 2) : 'Test required'} {isTested && 'Ω'}</td></tr>)}</tbody></table></div></section>}
    </section>

    {experiment.warnings.length > 0 && <section class="mf-findings" aria-label="Process findings"><h2>Process observations</h2><div>{experiment.warnings.map(w => <article key={w.id} class={`mf-finding mf-${w.severity}`}><span class="mf-label">{w.severity === 'error' ? 'Failure mechanism' : 'Observation'}</span><h3>{w.title}</h3><p>{w.detail}</p></article>)}</div></section>}

    <section class="mf-reading"><div><p class="mf-kicker">A documented process, an inspectable model</p><h2>From a mask to a working connection.</h2><p>This laboratory follows the sequence of a published polyimide microelectrode process. Its four-channel layout and effective process settings are teaching models. The material masks drive all three views and the electrical connectivity tests.</p><a href="/simulations/microfabrication/methods/">Read the equations, validation cases and source process ↗</a></div><ol><li><span>01</span><div><h3>Watch the process</h3><p>Replay the reference run. Stop at developed resist, deposited metal, and lift-off to inspect what changes.</p></div></li><li><span>02</span><div><h3>Make one change</h3><p>Offset the opening mask or shorten the contact etch. Move the section through an electrode site.</p></div></li><li><span>03</span><div><h3>Find the consequence</h3><p>Release, test, and compare the specimen. Save the recipe to repeat exactly the same experiment.</p></div></li></ol></section>
    <footer class="mf-footer"><span>Research &amp; education · Model {MODEL_VERSION}</span><a href="/simulations/interface-designer/">Electrode Designer ↗</a><a href="/simulations/tissue-mechanics/">Tissue Mechanics ↗</a></footer>
  </section>;
}
