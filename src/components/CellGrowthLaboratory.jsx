import SimHero from './SimHero.jsx';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DEFAULT_CONFIG, PRESETS, MODEL_VERSION } from '../lib/cell-growth/engine.js';
import GrowthScene from './cell-growth/GrowthScene.jsx';
import GrowthProjection from './cell-growth/GrowthProjection.jsx';
import '../styles/cell-growth.css';

const MODES = [
  { id: 'culture', number: '01', title: 'In vitro plate', detail: 'Planar substrate · local encounters' },
  { id: 'organoid', number: '02', title: 'Organoid environment', detail: '3D volume · crowding & guidance' },
  { id: 'regeneration', number: '03', title: 'Nerve regeneration', detail: 'Directional scaffold · physical barriers' },
  { id: 'biohybrid', number: '04', title: 'Biohybrid interface', detail: 'Living neurites · solid device surfaces' },
];
const SOURCE_LABELS = { stem: 'Stem-like cell', precursor: 'Neural precursor', immature: 'Immature neuron', polarized: 'Polarized neuron', maturing: 'Maturing neuron' };
const COMPARISONS = [
  {key:'motility',value:0,label:'Cell motility removed'},
  {key:'cellAdhesion',value:0,label:'Cell–cell adhesion removed'},
  {key:'adhesion',value:0,label:'Substrate adhesion removed'},
  { key: 'actin', value: 0, label: 'Actin drive removed' },
  { key: 'microtubules', value: 0, label: 'Microtubule support removed' },
  { key: 'tension', value: 2.5, label: 'Higher membrane tension' },
  { key: 'membraneSupply', value: .2, label: 'Restricted membrane supply' },
  { key: 'selfAvoidance', value: 0, label: 'Self-avoidance removed' },
  { key: 'guidance', value: 0, label: 'Guidance removed' },
  { key: 'fasciculation', value: 0, label: 'Fasciculation removed' },
];
const EXAMPLES = [
  {id:'migration',title:'A living, migrating cell',description:'Inspect a deforming precursor, its nucleus, adhesion turnover and measured traction. Begin at time zero.',previewHours:0,config:{mode:'culture',source:'precursor',cellCount:1,seed:101,guidance:.3}},
  {id:'aggregation',title:'Adhesion & emergent groups',description:'A dense culture with stronger short-range cell adhesion. Compare it against adhesion removed; a cluster is not prescribed.',previewHours:0,config:{mode:'culture',source:'stem',cellCount:18,density:2.8,cellAdhesion:.9,guidance:0,seed:205}},
  ...PRESETS,
  { id: 'polarization', title: 'A single developing neuron', description: 'Follow one precursor through process initiation, polarization and the separation of axonal and dendritic arbors.', config: { mode: 'culture', source: 'precursor', cellCount: 1, guidance: .25, noise: .25, seed: 101 } },
  { id: 'dendritic-exploration', title: 'Dendritic exploration', description: 'Increase branch initiation and same-cell avoidance, then inspect branch orders and separate Sholl profiles.', config: { mode: 'culture', source: 'immature', cellCount: 4, branching: 1.6, selfAvoidance: 1.7, guidance: .15, seed: 202 } },
  { id: 'membrane-limited', title: 'A membrane-limited culture', description: 'Restrict membrane replenishment. Watch the reserve and opposing tension change while extension slows.', config: { mode: 'culture', source: 'immature', cellCount: 6, membraneSupply: .15, seed: 303 } },
  { id: 'stem-start', title: 'Before neurite initiation', description: 'Begin with stem-like cells at time zero. Follow the assumed induction and precursor lags, then inspect the resulting morphology.', previewHours: 0, config: { mode: 'organoid', source: 'stem', cellCount: 8, seed: 404 } },
];
const fmt = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 }) : '—';
const cellName = cell => `Cell ${String(Number(cell.id) + 1).padStart(2, '0')}`;
const sourceName = stage => SOURCE_LABELS[stage] || String(stage || 'precursor').replaceAll('-', ' ');
const metricValue = (metrics, key) => Number(metrics?.[key] ?? 0);
const sameConfig = (a, b) => JSON.stringify(Object.keys(a || {}).sort().map(k => [k, a[k]])) === JSON.stringify(Object.keys(b || {}).sort().map(k => [k, b[k]]));

function download(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function RangeField({ label, name, value, min = 0, max = 2, step = .05, unit = '×', note, onChange }) {
  return <label class="cg-field">
    <span><b>{label}</b><output>{fmt(value, step < .1 ? 2 : 1)} <small>{unit}</small></output></span>
    <input type="range" aria-label={label} name={name} min={min} max={max} step={step} value={value}
      onInput={event => onChange(name, Number(event.currentTarget.value))} />
    {note && <small>{note}</small>}
  </label>;
}

function LinePlot({ series, xKey = 'timeHours', yKeys = ['totalAxonLength', 'totalDendriteLength'], colors = ['#68aaa1', '#b88e4e'], labels = ['Axon', 'Dendrite'], xLabel = 'Model time / h', yLabel = 'Length / µm', empty = 'Growth measurements appear as the experiment advances.' }) {
  const data = series || [];
  const width = 640, height = 240, left = 60, right = 17, top = 22, bottom = 47;
  const maxX = Math.max(1, ...data.map(row => Number(row[xKey]) || 0));
  const maxY = Math.max(1, ...data.flatMap(row => yKeys.map(k => Number(row[k]) || 0))) * 1.08;
  const px = x => left + x / maxX * (width - left - right), py = y => height - bottom - y / maxY * (height - top - bottom);
  return <div class="cg-plot">
    <div class="cg-plot-legend">{labels.map((label, index) => <span><i style={{ background: colors[index] }} />{label}</span>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${yLabel} plotted against ${xLabel}`}>
      {[0, .25, .5, .75, 1].map(f => <g key={f}>
        <line x1={left} x2={width - right} y1={py(f * maxY)} y2={py(f * maxY)} class="cg-gridline" />
        <text x={left - 10} y={py(f * maxY) + 4} textAnchor="end">{fmt(f * maxY, maxY < 10 ? 1 : 0)}</text>
        <text x={px(f * maxX)} y={height - bottom + 21} textAnchor="middle">{fmt(f * maxX, maxX < 10 ? 1 : 0)}</text>
      </g>)}
      <text x={left} y={13} class="cg-axis-label">{yLabel}</text><text x={(width + left) / 2} y={height - 5} textAnchor="middle" class="cg-axis-label">{xLabel}</text>
      {yKeys.map((key, index) => <path key={key} d={data.map((row, i) => `${i ? 'L' : 'M'}${px(Number(row[xKey]) || 0)},${py(Number(row[key]) || 0)}`).join(' ')} stroke={colors[index]} fill="none" strokeWidth="2.4" />)}
      {!data.length && <text x={width / 2 + 10} y={height / 2} textAnchor="middle">{empty}</text>}
    </svg>
  </div>;
}

function ForceBudget({ tip }) {
  const forces = tip?.forces || {};
  const items = [['Actin protrusion', 'actin', '#a2bb7f'], ['Adhesive traction', 'traction', '#7ab7aa'], ['Microtubule support', 'microtubule', '#c7aa70'], ['Membrane opposition', 'membrane', '#c58c78']];
  const max = Math.max(1, ...items.map(([, key]) => Math.abs(forces[key] || 0)));
  return <div class="cg-force-budget">
    {items.map(([label, key, color]) => <div class="cg-force-row" key={key}>
      <span>{label}<b>{fmt(forces[key], 1)} <small>pN</small></b></span>
      <div><i style={{ width: `${Math.min(100, Math.abs(forces[key] || 0) / max * 100)}%`, background: color }} /></div>
    </div>)}
    <dl class="cg-readings compact"><div><dt>Net axial drive</dt><dd>{fmt(forces.net)} pN</dd></div><div><dt>Extension speed</dt><dd>{fmt(forces.speed, 2)} µm/h</dd></div><div><dt>Retrograde actin flow</dt><dd>{fmt(forces.retrograde, 2)} µm/h</dd></div><div><dt>Engaged clutch</dt><dd>{fmt((forces.clutch || 0) * 100, 0)}%</dd></div></dl>
    <p class="cg-force-note">Net = actin + microtubules − membrane. Traction reduces retrograde flow and is already included in the actin term.</p>
  </div>;
}

function ConeDiagram({ tip }) {
  return <svg viewBox="0 0 280 126" class="cg-cone-diagram" role="img" aria-label="Schematic organization of a growth cone: axial microtubules enter a peripheral actin-rich membrane with projecting filopodia.">
    <defs><linearGradient id="cgConeFill"><stop stopColor="#a99568" stopOpacity=".22" /><stop offset="1" stopColor="#95bfb0" stopOpacity=".28" /></linearGradient></defs>
    <path d="M14 48H93C120 18 148 17 171 22C201 27 209 46 240 54C253 58 257 73 239 79C206 90 190 108 160 106C126 107 116 83 93 78H14" fill="url(#cgConeFill)" stroke="#aab9a2" strokeWidth="1.3" />
    {[50, 56, 64, 71, 77].map((y, i) => <path d={`M16 ${y}Q95 ${y} ${144 + i * 5} ${42 + i * 10}`} fill="none" stroke="#d4b475" strokeWidth="1.5" />)}
    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => { const a = -.95 + i / 8 * 1.9; return <path d={`M160 64L${190 + Math.cos(a) * 62} ${64 + Math.sin(a) * 65}`} stroke="#98c4ad" strokeWidth="1" opacity=".8" />; })}
    <text x="14" y="116">Microtubule bundle</text><text x="180" y="15">Actin-rich edge</text>
    <circle cx="168" cy="64" r="3" fill={tip?.status === 'stalled' ? '#d89f79' : '#d9e4bd'} />
  </svg>;
}

const OBSERVATION_START = {...DEFAULT_CONFIG,source:'immature',cellCount:1,seed:101,motility:.25,branching:1.3};

export default function CellGrowthLaboratory() {
  const worker = useRef(null), fileInput = useRef(null), mounted = useRef(true);
  const [draft, setDraft] = useState({ ...OBSERVATION_START });
  const [state, setState] = useState(null), [metrics, setMetrics] = useState(null);
  const [busy, setBusy] = useState(true), [playing, setPlaying] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('Growing a branched-neuron observation from time zero…');
  const [selectedCell, setSelectedCell] = useState(0), [selectedTip, setSelectedTip] = useState(null);
  const [controlTab, setControlTab] = useState('cells'), [analysisTab, setAnalysisTab] = useState('growth');
  const [isolate, setIsolate] = useState(false), [showMembrane, setShowMembrane] = useState(true), [showCytoskeleton, setShowCytoskeleton] = useState(false), [showForces, setShowForces] = useState(false);
  const [colorMode, setColorMode] = useState('identity'), [thickness, setThickness] = useState(1), [cameraAction, setCameraAction] = useState({ type: 'fit', count: 0 });
  const [webglUnavailable,setWebglUnavailable]=useState(false);
  const [inspectionMode,setInspectionMode]=useState('brightfield'),[showTrails,setShowTrails]=useState(false);
  const [viewBackend, setViewBackend] = useState('projection');
  const [frameDuration,setFrameDuration]=useState(140);
  const [speed, setSpeed] = useState(.1), [until, setUntil] = useState(72);
  const [comparisonIndex, setComparisonIndex] = useState(0), [comparisonHours, setComparisonHours] = useState(48), [comparison, setComparison] = useState(null), [comparing, setComparing] = useState(false), [compareProgress, setCompareProgress] = useState('');

  useEffect(() => {
    mounted.current = true;
    const instance = new Worker(new URL('../lib/cell-growth/worker.js', import.meta.url), { type: 'module' }); worker.current = instance;
    instance.onmessage = ({ data }) => {
      if (!mounted.current) return;
      if (data.type === 'state') {
        setState(data.state); setFrameDuration(data.frameDuration??140); setMetrics(data.metrics); setPlaying(Boolean(data.playing));
        if ('busy' in data) setBusy(data.busy);
        if (!data.busy && !data.playing) setNotice('Paused · inspect the culture or continue growth.');
        if (data.playing) setNotice('Growing · local tip motion and retained morphology evolve together.');
        if (data.previewComplete) setCameraAction(old => ({ type: 'fit', count: old.count + 1 }));
        if (data.preview) setNotice('Growing the reference culture from its initial state…');
        if (data.restored) { setComparison(null); setCompareProgress(''); setComparing(false); setDraft({ ...data.state.config }); setSelectedCell(data.state.cells[0]?.id ?? 0); setSelectedTip(null); setNotice('Experiment restored, including its random state and growth history.'); setCameraAction(old => ({ type: 'fit', count: old.count + 1 })); }
      } else if (data.type === 'error') { setError(data.message); setBusy(false); setPlaying(false); setComparing(false); }
      else if (data.type === 'export') {
        const extension = data.format === 'swc' ? 'swc' : data.format;
        download(data.content, data.format === 'json' ? 'application/json' : 'text/plain;charset=utf-8', `cell-growth-${data.format === 'swc' ? `cell-${Number(data.cellId) + 1}` : 'experiment'}.${extension}`);
        setNotice(`${data.format.toUpperCase()} export download requested.`);
      } else if (data.type === 'compare-progress') { setCompareProgress(`${data.label} · ${Math.round(data.progress * 100)}%`); }
      else if (data.type === 'comparison') { setComparison(data.runs); setComparing(false); setCompareProgress(''); setNotice(data.runs.some(run => run.limits?.reached) ? 'A comparison arm stopped at its capacity limit. Read the reached times before comparing.' : 'Paired experiment complete. The displayed culture is preserved.'); }
    };
    instance.onerror = event => { setError(event.message || 'The simulation worker could not start. Reload the page to try again.'); setBusy(false); setPlaying(false); setComparing(false); };
    instance.postMessage({ type: 'init', config: OBSERVATION_START, previewHours: 48 });
    return () => { mounted.current = false; instance.terminate(); worker.current = null; };
  }, []);

  const changed = state && !sameConfig(draft, state.config);
  const cell = state?.cells.find(c => c.id === selectedCell) || state?.cells[0];
  const cellMetrics = metrics?.perCell?.find?.(c => c.id === cell?.id || c.cellId === cell?.id) || metrics?.perCell?.[cell?.id] || {};
  const tips = state?.tips.filter(t => t.cellId === cell?.id && t.active) || [];
  const tip = tips.find(t => t.id === selectedTip) || tips.find(t => t.kind === 'axon') || tips[0];
  const mode = MODES.find(m => m.id === (state?.config.mode || draft.mode));
  const history = state?.history || [];
  const counts = useMemo(() => {
    const values = {}; (state?.cells || []).forEach(c => values[c.stage] = (values[c.stage] || 0) + 1); return values;
  }, [state]);
  const update = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  const send = data => { setError(''); worker.current?.postMessage(data); };
  const camera = type => setCameraAction(old => ({ type, count: old.count + 1 }));
  const select = (id, tipId) => { setSelectedCell(id); setSelectedTip(tipId); };
  const initialize = (config, previewHours = 0) => {
    setDraft({ ...config }); setBusy(true); setPlaying(false); setComparing(false); setComparison(null); setSelectedCell(0); setSelectedTip(null);
    setNotice(previewHours ? 'Calculating a reference culture…' : 'Starting a new culture at model time zero.');
    send({ type: 'init', config, previewHours }); camera('fit');
  };
  const selectMode = id => {
    const preset = PRESETS.find(p => p.id === id || p.config.mode === id);
    initialize({ ...DEFAULT_CONFIG, ...(preset?.config || {}), mode: id, seed: draft.seed }, 0);
  };
  const running = busy || playing || comparing;
  const microscopy = inspectionMode==='brightfield'||inspectionMode==='fluorescence';
  const pause = () => { send({ type: 'pause' }); setBusy(false); setPlaying(false); setComparing(false); setNotice('Paused.'); };
  const importFile = async event => {
    const input = event.currentTarget, file = input.files?.[0]; if (!file) return;
    try {
      if (file.size > 24 * 1024 * 1024) throw new Error('This experiment exceeds the 24 MB import limit.');
      const document = JSON.parse(await file.text()); setBusy(true); setComparing(false); send({ type: 'restore', document });
    } catch (cause) { setError(cause.message); setBusy(false); }
    input.value = '';
  };
  const runComparison = () => {
    const baseline = { ...(state?.config || draft) }, intervention = COMPARISONS[comparisonIndex];
    if (baseline[intervention.key] === intervention.value) { setError('Choose an intervention different from the current reference setting.'); return; }
    setComparing(true); setComparison(null); setPlaying(false); setBusy(false); setAnalysisTab('compare');
    send({ type: 'compare', hours: comparisonHours, cases: [{ label: 'Reference', config: baseline }, { label: intervention.label, config: { ...baseline, [intervention.key]: intervention.value } }] });
  };

  return <section class="cg-lab" aria-label="Cell Growth Laboratory">
    <SimHero kicker="Development & morphogenesis / Version 3" title="Cell Growth Laboratory" intro="Watch a neuron explore, extend, branch, and retract." links={[{ href: '/simulations/cell-growth/methods/', label: 'Model & evidence' }]} note="Membrane · cytoskeleton · contact" />

    <nav class="cg-environments" aria-label="Growth environment">{MODES.map(item => <button type="button" key={item.id} class={item.id === (state?.config.mode || draft.mode) ? 'active' : ''} aria-pressed={item.id === (state?.config.mode || draft.mode)} onClick={() => selectMode(item.id)}>
      <span>{item.number}</span><b>{item.title}</b><small>{item.detail}</small>
    </button>)}</nav>

    <div class="cg-toolbar">
      <div class="cg-run-buttons">
        <button type="button" class="cg-primary" disabled={!state || (!running && (changed || state.timeHours >= until - 1e-8 || state.limits.reached))} onClick={() => running ? pause() : send({ type: 'play', speed, until })}>{running ? 'Ⅱ Pause' : '▷ Run growth'}</button>
        <button type="button" disabled={!state || running || changed || state.timeHours >= 168 - 1e-8 || state.limits.reached} onClick={() => { setBusy(true); send({ type: 'advance', hours: 6 }); }}>+ 6 h</button>
        <button type="button" onClick={() => initialize(state?.config || draft)}>Reset to 0 h</button>
      </div>
      <div class="cg-time-controls"><label>Stop at <select aria-label="Stop at model time" disabled={running} value={until} onChange={e => setUntil(Number(e.currentTarget.value))}><option value="48">48 h</option><option value="72">72 h</option><option value="120">120 h</option><option value="168">168 h</option></select></label><label>Playback <select aria-label="Playback speed" disabled={running} value={speed} onChange={e => setSpeed(Number(e.currentTarget.value))}><option value={.005}>Tip study · detailed motion</option><option value={.025}>Slow growth</option><option value={.1}>Normal growth</option><option value={.5}>Fast growth</option></select></label><span class="cg-elapsed"><strong>{fmt(state?.timeHours, speed<.05?2:1)}</strong> <span>h<br /><small>model time</small></span></span></div>
    </div>
    <div class="cg-status-line" role="status" aria-live="polite"><span class={running ? 'cg-state-dot running' : 'cg-state-dot'} />{comparing ? compareProgress || 'Starting paired experiment…' : changed ? 'Settings changed. Apply and restart to calculate a new culture.' : notice}<span class="cg-version">Mechanistic exploratory model</span></div>
    {error && <div class="cg-alert" role="alert">{error}</div>}

    <div class="cg-workspace">
      <aside class="cg-controls" aria-label="Experiment settings">
        <header class="cg-panel-heading"><span>Experiment</span><small>Seed {draft.seed}</small></header>
        <div class="cg-control-tabs" role="tablist" aria-label="Parameter categories">{[['cells', 'Cells'], ['forces', 'Mechanics'], ['contact', 'Behavior']].map(([id, name]) => <button type="button" role="tab" aria-selected={controlTab === id} class={controlTab === id ? 'active' : ''} onClick={() => setControlTab(id)}>{name}</button>)}</div>
        <div class="cg-control-body">
          {controlTab === 'cells' && <>
            <label class="cg-select-field">Starting population<select aria-label="Starting population" value={draft.source} onChange={e => update('source', e.currentTarget.value)}><option value="stem">Stem-like cells</option><option value="precursor">Neural precursors</option><option value="immature">Immature neurons</option></select></label>
            <p class="cg-help">The starting state controls the developmental lag. These clocks are illustrative; they are not a human differentiation protocol.</p>
            <RangeField label="Population" name="cellCount" value={draft.cellCount} min={1} max={24} step={1} unit="cells" onChange={update} />
            <RangeField label="Culture density" name="density" value={draft.density} min={.5} max={3} note="Changes the initial spread on a plate; cell count stays fixed." onChange={update} />
            {draft.mode==='culture'&&<label class="cg-select-field">Plate layout<select aria-label="Plate layout" value={draft.cultureLayout} onChange={e=>update('cultureLayout',e.currentTarget.value)}><option value="plain">Unpatterned culture</option><option value="obstacles">Obstacle assay</option></select></label>}
            <label class="cg-seed-field">Random seed<input type="number" aria-label="Random seed" min="0" max="4294967295" step="1" value={draft.seed} onChange={e => { const n = Number(e.currentTarget.value); if (Number.isFinite(n)) update('seed', Math.max(0, Math.min(4294967295, Math.round(n)))); }} /></label>
            <div class="cg-control-rule" />
            <RangeField label="Membrane supply" name="membraneSupply" value={draft.membraneSupply} max={2} note="Area reserve available to extend processes." onChange={update} />
            <RangeField label="Growth episodes" name="growthPulses" value={draft.growthPulses} max={1} note="Traveling actin-associated waves and independent local episodes. Zero gives continuous drive." onChange={update} />
            <RangeField label="Branch initiation" name="branching" value={draft.branching} max={2} note="Scales axon and dendrite branch hazards separately." onChange={update} />
            <div class="cg-mini-note"><b>Developmental sequence</b><p>Precursor → immature processes → polarization → arbor elaboration.</p></div>
          </>}
          {controlTab === 'forces' && <>
            <RangeField label="Cell motility" name="motility" value={draft.motility} max={2} note="Active cortex deformation and transmitted traction." onChange={update} />
            <RangeField label="Contractility" name="contractility" value={draft.contractility} max={2} note="Rear contraction and adhesion turnover." onChange={update} />
            <RangeField label="Actin protrusion" name="actin" value={draft.actin} max={2} note="Forward drive at the growth-cone edge." onChange={update} />
            <RangeField label="Microtubule support" name="microtubules" value={draft.microtubules} max={2} note="Stabilization and consolidation behind the tip." onChange={update} />
            <RangeField label="Membrane tension" name="tension" value={draft.tension} max={3} note="Opposes extension; the local force is shown in the inspector." onChange={update} />
            <RangeField label="Adhesion" name="adhesion" value={draft.adhesion} max={1} unit="fraction" note="Effective clutch availability." onChange={update} />
            <label class="cg-select-field">Substrate spring<select aria-label="Substrate spring" value={draft.stiffness} onChange={e => update('stiffness', Number(e.currentTarget.value))}><option value="10">10 pN/µm · compliant</option><option value="30">30 pN/µm</option><option value="100">100 pN/µm · reference</option><option value="300">300 pN/µm</option><option value="1000">1,000 pN/µm · stiff</option></select></label>
            <details class="cg-advanced"><summary>Membrane–cortex parameters</summary><RangeField label="Cortex elasticity" name="cortexStiffness" value={draft.cortexStiffness} min={.2} max={3} onChange={update}/><RangeField label="Curvature resistance" name="bending" value={draft.bending} max={3} onChange={update}/></details>
            <p class="cg-help">An effective spring at the contact. This is not a bulk tissue modulus in kPa.</p>
          </>}
          {controlTab === 'contact' && <>
            <RangeField label="Cell–cell adhesion" name="cellAdhesion" value={draft.cellAdhesion} max={1} unit="fraction" note="Short-range attraction between cell envelopes." onChange={update}/>
            <RangeField label="Contact inhibition" name="contactInhibition" value={draft.contactInhibition} max={2} note="Contact-dependent turning of cell polarity." onChange={update}/>
            <RangeField label="Guidance response" name="guidance" value={draft.guidance} max={2} note="Directional bias toward the environment's cue." onChange={update} />
            <RangeField label="Dendritic self-avoidance" name="selfAvoidance" value={draft.selfAvoidance} max={2} note="Recognition of branches belonging to the same cell." onChange={update} />
            <RangeField label="Axonal fasciculation" name="fasciculation" value={draft.fasciculation} max={1} note="Contact alignment with nearby axons." onChange={update} />
            <RangeField label="Directional variability" name="noise" value={draft.noise} max={1} note="Seeded angular fluctuations, scaled with the timestep." onChange={update} />
            <div class="cg-mini-note"><b>Contact is not a synapse</b><p>The lab distinguishes a physical encounter from a sustained candidate apposition. Electrical transmission is outside this model.</p></div>
          </>}
        </div>
        <div class="cg-apply"><button class={changed ? 'cg-primary' : ''} type="button" onClick={() => initialize(draft)} disabled={!changed && Boolean(state)}>Apply &amp; restart</button><small>Dimensionless gains use × relative to the reference. Physical readouts use µm, h and pN.</small></div>
      </aside>

      <main class="cg-specimen">
        <div class="cg-reference-starts" aria-label="Microscopy experiments"><span>Observe growth</span><button type="button" disabled={running} onClick={()=>initialize(OBSERVATION_START,12)}>Single neuron · 12 h</button><button type="button" disabled={running} onClick={()=>initialize(OBSERVATION_START,48)}>Branched neuron · 48 h</button><button type="button" disabled={running} onClick={()=>initialize({...DEFAULT_CONFIG,source:'immature',cellCount:6,seed:714,motility:.25,branching:1.3,density:1.3},24)}>Sparse culture · 24 h</button><small>Calculated from time zero</small></div>
        <div class="cg-view-header"><label>View <select aria-label="Geometry view" disabled={microscopy} value={viewBackend} onChange={e => { setViewBackend(e.currentTarget.value); camera('fit'); }}><option value="projection">{microscopy?'Microscopy projection':'Software 3D'}</option><option value="3d" disabled={webglUnavailable}>WebGL surface</option></select></label><div class="cg-view-buttons"><button type="button" onClick={() => camera('fit')}>Fit</button><button type="button" onClick={() => camera('top')}>Top</button><button type="button" disabled={!cell} onClick={() => camera('cell')}>Cell</button><button type="button" disabled={!tip} onClick={() => { setSelectedTip(tip.id); camera('tip'); }}>Tip</button></div></div>
        <div class="cg-inspection-modes" aria-label="Cell visualization mode">{[['brightfield','Phase contrast'],['fluorescence','Fluorescence'],['structural','Structural 3D'],['mechanics','Mechanics']].map(([id,label])=><button type="button" aria-pressed={inspectionMode===id} class={inspectionMode===id?'active':''} onClick={()=>{setInspectionMode(id);setViewBackend(id==='brightfield'||id==='fluorescence'||webglUnavailable?'projection':'3d');}}>{label}</button>)}</div>
        <div class={`cg-viewport cg-appearance-${inspectionMode}`}>
          {viewBackend === '3d' && !['brightfield','fluorescence'].includes(inspectionMode) ? <GrowthScene state={state} selectedCell={cell?.id ?? selectedCell} selectedTip={tip?.id ?? selectedTip} onSelect={select} isolate={isolate} showMembrane={showMembrane} showCytoskeleton={showCytoskeleton} showForces={showForces} colorMode={colorMode} thickness={thickness} cameraAction={cameraAction} inspectionMode={inspectionMode} showTrails={showTrails} onUnavailable={()=>{setWebglUnavailable(true);setViewBackend('projection');}} /> : <GrowthProjection state={state} animating={playing} frameDuration={frameDuration} selectedCell={cell?.id ?? selectedCell} selectedTip={tip?.id ?? selectedTip} onSelect={select} isolate={isolate} showMembrane={showMembrane} showCytoskeleton={showCytoskeleton} showForces={showForces} colorMode={colorMode} thickness={thickness} cameraAction={cameraAction} inspectionMode={inspectionMode} showTrails={showTrails} />}
          <div class="cg-scene-caption"><span>{state ? `${state.cells.length} cells · ${state.segments.filter(s => s.alive !== false).length.toLocaleString()} retained elements` : 'Initializing culture'}</span><small>Drag to orbit · scroll to zoom · click a cell</small></div>
          <div class="cg-scene-legend" hidden={inspectionMode==='brightfield'||inspectionMode==='fluorescence'}>{colorMode === 'identity' ? <><span><i class="axon" />Axon</span><span><i class="dendrite" />Dendrite</span></> : <><span><i class="dendrite" />Low MT support</span><span><i class="support" />High MT support</span></>}<span><i class="contact" />Contact candidate</span><span><i class="cue" />Guidance cue</span></div>
        </div>
        <div class="cg-view-options"><label><input type="checkbox" checked={isolate} onChange={e => setIsolate(e.currentTarget.checked)} /> Isolate cell</label><label><input type="checkbox" disabled={microscopy} checked={showMembrane} onChange={e => setShowMembrane(e.currentTarget.checked)} /> Membrane</label><label><input type="checkbox" disabled={microscopy} checked={showCytoskeleton} onChange={e => setShowCytoskeleton(e.currentTarget.checked)} /> Cytoskeleton</label><label><input type="checkbox" disabled={microscopy} checked={showForces} onChange={e => setShowForces(e.currentTarget.checked)} /> Forces</label><label><input type="checkbox" disabled={microscopy} checked={showTrails} onChange={e=>setShowTrails(e.currentTarget.checked)}/> Migration tracks</label><label>Color<select aria-label="Neurite color" disabled={microscopy} value={colorMode} onChange={e => setColorMode(e.currentTarget.value)}><option value="identity">Axon / dendrite</option><option value="microtubules">MT support</option></select></label><label>{microscopy?'Shaft radius':'Display radius'}<select aria-label="Display radius scale" value={thickness} onChange={e => setThickness(Number(e.currentTarget.value))}><option value="1">1×</option><option value="2">2× display</option><option value="3">3× display</option></select></label></div>
        <p class="cg-view-note"><a href="/simulations/cell-growth/methods/#microscopy">Microscopy evidence →</a> Microscopy views show the solved morphology with approximate contrast. Moving tips, side buds, and traveling actin-associated signals come from the model. Contrast and intracellular texture are illustrative; Mechanics shows the collision envelopes. Playback smooths between computed frames; pause shows the completed solver state.</p>
        {!microscopy && colorMode === 'microtubules' && <p class="cg-view-note">Shaft colors show microtubule support: amber → green means low → high. Growth-cone colors retain axon / dendrite identity. Display color does not change growth.</p>}
        {!microscopy && showForces && <p class="cg-view-note">Arrows show cell traction and growth-cone traction (green), plus cone membrane opposition (coral). Arrow lengths are scaled for inspection; use the pN readouts for force values.</p>}
        <div class="cg-metrics-strip"><div><span>Axonal length</span><strong>{fmt(metricValue(metrics, 'totalAxonLength'), 0)} <small>µm</small></strong></div><div><span>Dendritic length</span><strong>{fmt(metricValue(metrics, 'totalDendriteLength'), 0)} <small>µm</small></strong></div><div><span>Active tips</span><strong>{fmt(metrics?.activeTips, 0)}</strong></div><div><span>Branch points</span><strong>{fmt(metrics?.branches, 0)}</strong></div></div>
      </main>

      <aside class="cg-inspector" aria-label="Selected cell inspector">
        <header class="cg-panel-heading"><span>Cell inspector</span><button type="button" disabled={!cell} onClick={() => camera('cell')}>Locate ↗</button></header>
        <label class="cg-select-field cg-cell-selector">Selected cell<select aria-label="Selected cell" value={cell?.id ?? 0} onChange={e => select(Number(e.currentTarget.value), null)}>{(state?.cells || []).map(item => <option value={item.id}>{cellName(item)} · {sourceName(item.stage)}</option>)}</select></label>
        <div class="cg-cell-stage"><span>{sourceName(cell?.stage)}</span><small>{fmt(cell?.ageHours)} h in model</small></div>
        <dl class="cg-readings"><div><dt>Axon length</dt><dd>{fmt(cellMetrics.axonLength)} µm</dd></div><div><dt>Dendrite length</dt><dd>{fmt(cellMetrics.dendriteLength)} µm</dd></div><div><dt>Branches / tips</dt><dd>{fmt(cellMetrics.branches, 0)} / {tips.length}</dd></div><div><dt>Membrane tension</dt><dd>{fmt(cell?.membrane?.tension, 2)} pN/µm</dd></div><div><dt>Membrane reserve</dt><dd>{fmt((cell?.membrane?.reserve || 0) * 100, 0)}%</dd></div><div><dt>Cytoskeletal supply</dt><dd>{fmt((cell?.supply || 0) * 100, 0)}%</dd></div></dl>
        <details class="cg-cell-mechanics" open><summary>Why this cell moves</summary><p class="cg-help">{(cell?.mechanics?.contactCount||0)>0?'Contact constraints are resisting or redirecting the cortex.':(cellMetrics.cellSpeed||0)>.05?'Polarized actin and substrate coupling generate traction; the nucleus follows through an internal tether.':'The cell is settling, weakly coupled, or constrained by its established processes.'}</p><dl class="cg-readings"><div><dt>Speed</dt><dd>{fmt(cellMetrics.cellSpeed,2)} µm/h</dd></div><div><dt>Displacement / path</dt><dd>{fmt(cellMetrics.displacement)} / {fmt(cellMetrics.pathLength)} µm</dd></div><div><dt>Cell traction</dt><dd>{fmt(Math.hypot(...(cell?.mechanics?.traction||[0,0,0])),0)} pN</dd></div><div><dt>Adhesion engaged</dt><dd>{fmt((cell?.mechanics?.adhesionMean||0)*100,0)}%</dd></div><div><dt>Area / volume strain</dt><dd>{fmt((cellMetrics.areaStrain||0)*100)} / {fmt((cellMetrics.volumeStrain||0)*100)}%</dd></div><div><dt>Mesh quality</dt><dd>{fmt(cellMetrics.meshQuality,2)}</dd></div><div><dt>Constrained steps</dt><dd>{cell?.mechanics?.rejectedSteps||0}</dd></div></dl></details>
        <div class="cg-tip-heading"><b>Growth-cone mechanics</b><label><select aria-label="Selected growth cone" value={tip?.id ?? ''} disabled={!tips.length} onChange={e => setSelectedTip(Number(e.currentTarget.value))}>{tips.length ? tips.map(item => <option value={item.id}>{item.kind === 'axon' ? 'Axon' : 'Dendrite'} tip {item.id + 1} · {item.status || 'growing'}</option>) : <option value="">No active growth cone</option>}</select></label></div>
        <dl class="cg-readings cg-local-behavior"><div><dt>Tip behavior</dt><dd>{tip?.status==='retracting'?'Retracting':tip?.status==='contact'?'Contact-limited':tip?.forces?.speed>.5?((tip?.exploration?.pulse||0)>.5?'Wave-associated extension':'Extending'):'Exploring / paused'}</dd></div><div><dt>Wave arrivals at this tip</dt><dd>{tip?.exploration?.arrivals??0}</dd></div><div><dt>Temporary side buds</dt><dd>{state?.buds?.filter(b=>b.cellId===cell?.id).length??0}</dd></div></dl>
        <ConeDiagram tip={tip} />
        <small class="cg-diagram-note">Effective cone organization. Individual filaments are schematic.</small>
        {tip ? <ForceBudget tip={tip} /> : <p class="cg-no-tip">Advance the experiment to grow processes, then select a tip to inspect its force balance.</p>}
      </aside>
    </div>

    {state?.limits && Object.values(state.limits).some(v => v === true) && <div class="cg-alert">A model capacity limit was reached. Some growth or branching is constrained by the computational cap; reduce the population or shorten the experiment. Export the run to inspect its limit flags.</div>}
    {state?.limits?.tipLimitedCount > 0 && <p class="cg-cap-note">The {state.config.maxTipsPerCell}-tip limit suppressed {state.limits.tipLimitedCount} branch opportunities. Existing tips continue to develop.</p>}
    {state?.timeHours > 168 && <p class="cg-cap-note">This restored experiment is beyond the interface's 168-hour playback range. You can inspect and export it, or reset its configuration to start a new culture.</p>}

    <section class="cg-analysis" aria-label="Growth analysis">
      <div class="cg-analysis-heading"><div><p class="cg-kicker">Measurements from the simulated morphology</p><h2>Observe what changes.</h2></div><div class="cg-analysis-tabs" role="tablist" aria-label="Analysis view">{[['migration','Cell migration'], ['growth', 'Growth history'], ['morphology', 'Arbor structure'], ['contacts', 'Encounters'], ['compare', 'Paired experiment']].map(([id, title]) => <button type="button" role="tab" aria-selected={analysisTab === id} class={analysisTab === id ? 'active' : ''} onClick={() => setAnalysisTab(id)}>{title}</button>)}</div></div>
      {analysisTab==='migration'&&<div class="cg-analysis-grid"><div><h3>Displacement &amp; cell speed</h3><LinePlot series={history} yKeys={['meanDisplacement']} colors={['#68aaa1']} labels={['Mean displacement']} yLabel="Distance from initial position / µm"/><p class="cg-help">Tracks record actual cell-centroid motion. No trajectory is prescribed.</p></div><div><h3>Local organization</h3><dl class="cg-readings"><div><dt>Mean speed</dt><dd>{fmt(metrics?.meanCellSpeed,2)} µm/h</dd></div><div><dt>Cell contacts</dt><dd>{metrics?.cellContacts||0}</dd></div><div><dt>Contact clusters</dt><dd>{metrics?.clusters||0}</dd></div><div><dt>Largest connected group</dt><dd>{metrics?.largestCluster||1} cells</dd></div></dl><p class="cg-help">Groups are connected components of conservative soma envelopes within 1 µm. They are geometric organizations, not validated tissue or functional networks.</p></div></div>}
      {analysisTab === 'growth' && <div class="cg-analysis-grid"><div><h3>Axon &amp; dendrite development</h3><LinePlot series={history} /><p class="cg-help">Lengths sum retained segments, so retraction can reduce a trace. Curves follow the current run, including its developmental lag.</p></div><div><h3>Population state</h3><div class="cg-stage-list">{Object.entries(counts).map(([stage, count]) => <div><span>{sourceName(stage)}</span><div><i style={{ width: `${count / Math.max(1, state?.cells.length || 1) * 100}%` }} /></div><b>{count}</b></div>)}</div><div class="cg-analysis-note"><h4>Two different developmental programs</h4><p>Axons favor persistent, directed extension and contact alignment. Dendrites build local arbors through branching, exploration, self-avoidance and retraction. Their lengths and branch structures are measured separately.</p><a href="/simulations/cell-growth/methods/#arbors">Read the growth rules →</a></div></div></div>}
      {analysisTab === 'morphology' && <div class="cg-analysis-grid"><div><h3>{cell ? cellName(cell) : 'Selected cell'} · Sholl profiles</h3><LinePlot series={(cellMetrics.sholl || []).map((row, i) => ({ radius: row.radius, axon: cellMetrics.shollAxon?.[i]?.intersections || 0, dendrite: cellMetrics.shollDendrite?.[i]?.intersections || 0 }))} xKey="radius" yKeys={['axon', 'dendrite']} labels={['Axon crossings', 'Dendrite crossings']} xLabel="Distance from soma / µm" yLabel="Crossings" empty="The arbor has not reached a sampling shell yet." /><p class="cg-help">Counts crossings of concentric spheres centered on the soma. Axonal and dendritic intersections are measured separately.</p><div class="cg-table-wrap"><table><thead><tr><th>Selected cell</th><th>Axon</th><th>Dendrite</th></tr></thead><tbody><tr><th>Longest path / µm</th><td>{fmt(cellMetrics.longestAxonPath)}</td><td>{fmt(cellMetrics.longestDendritePath)}</td></tr><tr><th>Radial reach / µm</th><td>{fmt(cellMetrics.axonReach)}</td><td>{fmt(cellMetrics.dendriteReach)}</td></tr><tr><th>Active tips</th><td>{fmt(cellMetrics.axonTips, 0)}</td><td>{fmt(cellMetrics.dendriteTips, 0)}</td></tr></tbody></table></div><p class="cg-help">Branch points by order: {Object.entries(cellMetrics.branchOrders || {}).map(([order, count]) => `order ${order}: ${count}`).join(' · ') || 'No branch points yet'}. Path length follows the arbor; reach is the straight-line distance from the soma.</p></div><div><h3>Cell-by-cell morphology</h3><div class="cg-table-wrap"><table><thead><tr><th>Cell</th><th>Axon / µm</th><th>Dendrite / µm</th><th>Branches</th></tr></thead><tbody>{(metrics?.perCell || []).map((item, index) => <tr class={(item.id ?? item.cellId ?? index) === cell?.id ? 'selected' : ''}><td><button type="button" onClick={() => select(item.id ?? item.cellId ?? index, null)}>{String(index + 1).padStart(2, '0')}</button></td><td>{fmt(item.axonLength)}</td><td>{fmt(item.dendriteLength)}</td><td>{fmt(item.branches, 0)}</td></tr>)}</tbody></table></div><div class="cg-analysis-note"><h4>Shape, material &amp; speed</h4><p>The selected cell has {fmt(cellMetrics.shaftArea, 0)} µm² of retained cylindrical shaft surface and {fmt(cellMetrics.membraneArea, 0)} µm² of soma shell. Its dendritic x/z convex-hull coverage is {fmt(cellMetrics.dendriticFieldArea,0)} µm², with {cellMetrics.branchAngles?.length||0} measured sister-branch angles. Its active cones sum to {fmt(cellMetrics.extensionRate, 2)} µm/h of extension and {fmt(cellMetrics.retractionRate, 2)} µm/h of retraction.</p></div></div></div>}
      {analysisTab === 'contacts' && <div class="cg-analysis-grid"><div><h3>Physical encounters &amp; appositions</h3><LinePlot series={history} yKeys={['collisionEvents', 'contacts']} colors={['#b68b72', '#9b81a2']} labels={['Collision events', 'Sustained contacts']} yLabel="Count" /><p class="cg-help">A collision is an attempted physical encounter. Contact counts do not imply a functional synapse or electrical connectivity.</p></div><div><h3>Recent model events</h3><div class="cg-event-list">{(state?.events || []).slice(-10).reverse().map((event, index) => <div key={index}><time>{fmt(event.timeHours ?? event.time, 1)} h</time><span>{event.message || event.label || event.type || 'Encounter'}{event.cellId !== undefined ? ` · cell ${Number(event.cellId) + 1}` : ''}</span></div>)}{!state?.events?.length && <p>Events will appear as the culture develops.</p>}</div><p class="cg-help">Myelination and action potentials are outside this lab's current growth model.</p></div></div>}
      {analysisTab === 'compare' && <div class="cg-comparison"><div class="cg-comparison-controls"><div><h3>Change one mechanism.</h3><p>Restart both arms with the same population, seed and environment. Measure the response at the same model time.</p></div><label>Intervention<select aria-label="Comparison intervention" value={comparisonIndex} onChange={e => setComparisonIndex(Number(e.currentTarget.value))}>{COMPARISONS.map((item, index) => <option value={index}>{item.label}</option>)}</select></label><label>Duration<select aria-label="Comparison duration" value={comparisonHours} onChange={e => setComparisonHours(Number(e.currentTarget.value))}><option value="24">24 h</option><option value="48">48 h</option><option value="72">72 h</option></select></label><button type="button" class="cg-primary" disabled={!state || running || changed} onClick={runComparison}>Run paired experiment</button></div>{comparing && <p role="status">{compareProgress || 'Running matched cultures…'} <button type="button" onClick={pause}>Cancel</button></p>}{comparison?.some(run => run.limits?.reached) && <div class="cg-alert">A comparison arm reached its segment budget. Final values may represent different model times; the plot only compares common sampled times.</div>}{comparison && <div class="cg-analysis-grid"><div><LinePlot series={comparison[0].history.flatMap((row, i) => { const other = comparison[1].history[i]; return other && Math.abs(other.timeHours - row.timeHours) < 1e-6 ? [{ timeHours: row.timeHours, reference: row.totalAxonLength + row.totalDendriteLength, intervention: other.totalAxonLength + other.totalDendriteLength }] : []; })} yKeys={['reference', 'intervention']} colors={['#6e9e8e', '#be9162']} labels={comparison.map(run => run.label)} yLabel="Total neurite length / µm" /></div><div class="cg-table-wrap"><table><thead><tr><th>Readout</th>{comparison.map(run => <th>{run.label}</th>)}</tr></thead><tbody><tr><th>Reached model time / h</th>{comparison.map(run => <td>{fmt(run.hours, 2)}{run.limits?.reached ? ' · capped' : ''}</td>)}</tr>{[['Axon length / µm', 'totalAxonLength'], ['Dendrite length / µm', 'totalDendriteLength'], ['Branch points', 'branches'], ['Active tips', 'activeTips'], ['Sustained contacts', 'contacts'], ['Mean displacement / µm','meanDisplacement'], ['Cell clusters','clusters']].map(([label, key]) => <tr><th>{label}</th>{comparison.map(run => <td>{fmt(run.metrics[key])}</td>)}</tr>)}</tbody></table><button type="button" onClick={() => download(JSON.stringify({ model: MODEL_VERSION, type: 'matched-comparison', runs: comparison }, null, 2), 'application/json', 'cell-growth-paired-experiment.json')}>Download paired results</button></div></div>}{!comparison && !comparing && <p class="cg-help">This is a single-seed causal comparison, not an estimate of biological uncertainty. Branching and contact histories can diverge after an intervention.</p>}</div>}
    </section>

    <section class="cg-experiments"><header><p class="cg-kicker">Starting points</p><h2>A question for every culture.</h2></header><div class="cg-experiment-grid">{EXAMPLES.map((preset, index) => <button type="button" class="cg-experiment-card" onClick={() => initialize({ ...DEFAULT_CONFIG, ...preset.config }, preset.previewHours ?? 0)}><span>{String(index + 1).padStart(2, '0')} / Experiment</span><h3>{preset.title}</h3><p>{preset.description}</p><b>Open culture ↗</b></button>)}</div></section>

    <div class="cg-export-bar"><div><b>Keep the experiment.</b><p>JSON preserves the complete state. CSV records measurements. SWC exports the selected cell's generated morphology.</p></div><div><button type="button" disabled={!state || busy || comparing} onClick={() => send({ type: 'export', format: 'json' })}>Save JSON</button><button type="button" disabled={!state || busy || comparing} onClick={() => send({ type: 'export', format: 'csv' })}>Metrics CSV</button><button type="button" disabled={!cell || busy || comparing} onClick={() => send({ type: 'export', format: 'swc', cellId: cell.id })}>Cell SWC</button><button type="button" onClick={() => fileInput.current?.click()}>Open JSON</button><input type="file" ref={fileInput} hidden accept=".json,application/json" onChange={importFile} /></div></div>

    <footer class="cg-scope"><div><h2>What the model can tell you</h2><p>This laboratory calculates how its declared local mechanisms produce geometry: growth, turning, branching, retraction and contact. Literature informs those mechanisms; the parameters and developmental clocks have not been fitted to a particular human cell line. The organoid setting is a 3D microenvironment, and stem-like induction is an illustrative state transition.</p><p>The cell membrane is represented mechanically. It does not solve membrane voltage, individual molecular filaments, cell division, full organoid patterning or myelination. Candidate contacts do not establish functional synapses.</p></div><div><a href="/simulations/cell-growth/methods/">Equations, verification &amp; primary sources ↗</a><a href="/simulations/biohybrid-interface/">Biohybrid electrical experiments ↗</a><a href="/simulations/nerve-regeneration/">Peripheral nerve regeneration ↗</a><small>{MODEL_VERSION} · Geometry: µm · Time: h · Force: pN</small></div></footer>
  </section>;
}
