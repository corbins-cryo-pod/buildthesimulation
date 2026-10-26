import { initAdvanced } from './advanced/app.js';
import { DEFAULT_CONFIG, MODEL_VERSION, validateConfig, pulseIntervals, resolveNodes, expressionFactor } from "./simulation.js";
import { createSweep, summarizeTrial } from "./sweep.js";
import { lightAt } from "./optics.js";
import { createNeuronScene } from "./scene.js";
import { createRecordingPlots } from "./plots.js";

const $ = id => document.getElementById(id);
const copy = value => JSON.parse(JSON.stringify(value));
const fmt = (x, digits = 2) => Number.isFinite(x) ? x.toFixed(digits).replace('-', '−') : '—';
const model = JSON.parse($('cell-data').textContent);
const verification = JSON.parse($('validation-data').textContent);
const cloneDefault = () => ({ ...copy(DEFAULT_CONFIG), conductanceDensityScm2: 0.00035 });
let config = cloneDefault(), result = null, baseline = null, nodes = [], selected = 0, frame = 0;
let worker = null, workerUrl = null, jobId = 0, busy = false, playing = false, lastPlayTime = 0, playMs = 0;
let activeJob='run', sweepSpec=null, sweepResults=[];
let savedNeuron = null, savedClamp = null, currentWorkspace = 'neuron', currentPreset = 'train';
const controlIds = ['preset', 'source', 'irradiance', 'power', 'aim', 'distance', 'azimuth', 'elevation',
  'expression', 'density', 'protocol', 'width', 'frequency', 'gap', 'mesh', 'timestep', 'clamp-mv', 'onset', 'epoch', 'record-duration'];
const meshNodes = resolveNodes(model, cloneDefault());
const nearest = (type, point) => meshNodes.filter(n => n.areaUm2 > 0 && n.sectionType === type)
  .reduce((a, n) => Math.hypot(...n.centerUm.map((v, i) => v - point[i])) < Math.hypot(...a.centerUm.map((v, i) => v - point[i])) ? n : a);
const aimPoints = {
  soma: meshNodes.find(n => n.sectionType === 'soma').centerUm.slice(),
  apical: nearest('apic', [0, -230, 0]).centerUm.slice(),
  basal: nearest('dend', [0, 110, 0]).centerUm.slice(),
};
const scene = createNeuronScene($('neuron-scene'), { onSelect: index => selectCompartment(index) });
scene.setLightSampler(lightAt);
const plots = createRecordingPlots({
  light: $('plot-light'), photo: $('plot-photo'), voltage: $('plot-voltage'), spikes: $('plot-spikes'),
}, time => { pause(); setFrame(frameAtTime(time, true)); });

function setRange(id, value) {
  const input = $(id);
  if (value < Number(input.min)) input.min = String(value);
  if (value > Number(input.max)) input.max = String(value);
  input.value = String(value);
  if (Math.abs(Number(input.value) - value) > 1e-8) { input.step = 'any'; input.value = String(value); }
}
function setSelect(id, value) {
  const select = $(id);
  if (![...select.options].some(option => option.value === String(value))) {
    const option = document.createElement('option'); option.value = String(value);
    option.textContent = value === 'custom' ? (id === 'preset' ? 'Custom setup' : 'Custom coordinates') : String(value) + ' · imported';
    select.append(option);
  }
  select.value = String(value);
}
function setText(id, value) { $(id).textContent = value; }
function showError(message) { $('error').hidden = false; setText('error', message); }
function clearError() { $('error').hidden = true; setText('error', ''); }

function syncControls() {
  const clamp = config.mode === 'clamp', fiber = !clamp && config.light.kind === 'fiber';
  $('neuron-identity').hidden = clamp; $('clamp-settings').hidden = !clamp;
  $('source-select').hidden = clamp; $('fiber-input').hidden = !fiber; $('uniform-input').hidden = fiber;
  $('expression').disabled = clamp || busy; $('mesh').disabled = clamp || busy;
  setRange('onset',config.onsetMs); setRange('epoch',config.trainDurationMs); setRange('record-duration',config.durationMs);
  setText('onset-value',fmt(config.onsetMs,0)+' ms'); setText('epoch-value',fmt(config.trainDurationMs,0)+' ms'); setText('record-duration-value',fmt(config.durationMs,0)+' ms');
  $('epoch-field').hidden=!['train','step'].includes(config.protocol);
  setText('expression-note',config.expression==='section'?'Section: '+config.expressionSectionId:config.expression==='axon'?'Synthetic source-prescribed stub, not the reconstructed biological axon.':'Spatial expression is independent of illumination.');
  $('source').value = config.light.kind;
  $('expression').value = config.expression;
  $('protocol').value = config.protocol;
  $('frequency-field').hidden = config.protocol !== 'train';
  $('gap-field').hidden = config.protocol !== 'paired';
  $('width').max = config.protocol === 'step' ? '200' : '50';
  setRange('width', config.protocol === 'step' ? config.trainDurationMs : config.pulseWidthMs);
  setRange('irradiance', config.light.irradianceMwMm2); setRange('power', config.light.powerMw);
  setRange('density', config.conductanceDensityScm2 * 1000);
  setRange('frequency', config.frequencyHz); setRange('gap', config.pairGapMs); setRange('clamp-mv', config.clampMv);
  setSelect('mesh', config.segmentLengthUm); setSelect('timestep', config.dtMs);
  setSelect('preset', currentPreset);
  $('preset').querySelector('[value=fiber]').disabled = clamp;
  $('preset').querySelector('[value=pulse]').textContent = clamp ? 'Brief light pulse' : 'First optical spike';
  const delta = config.light.positionUm.map((v, i) => v - config.light.targetUm[i]), distance = Math.hypot(...delta);
  setRange('distance', distance);
  setRange('azimuth', Math.atan2(delta[1], delta[0]) * 180 / Math.PI);
  setRange('elevation', Math.asin(delta[2] / Math.max(distance, 1e-9)) * 180 / Math.PI);
  const aim = Object.keys(aimPoints).find(key => Math.hypot(...aimPoints[key].map((v, i) => v - config.light.targetUm[i])) < 1e-5);
  setSelect('aim', aim ?? 'custom');
  const labels = {
    'irradiance-value': fmt(config.light.irradianceMwMm2) + ' mW/mm²',
    'power-value': fmt(config.light.powerMw, 3) + ' mW',
    'density-value': fmt(config.conductanceDensityScm2 * 1000) + ' mS/cm²',
    'width-value': fmt(config.protocol === 'step' ? config.trainDurationMs : config.pulseWidthMs, 1) + ' ms',
    'frequency-value': fmt(config.frequencyHz, 0) + ' Hz',
    'gap-value': fmt(config.pairGapMs, 1) + ' ms',
    'clamp-mv-value': fmt(config.clampMv, 0) + ' mV',
    'distance-value': fmt(distance, 0) + ' µm',
    'azimuth-value': fmt(Math.atan2(delta[1], delta[0]) * 180 / Math.PI, 0) + '°',
    'elevation-value': fmt(Math.asin(delta[2] / Math.max(distance, 1e-9)) * 180 / Math.PI, 0) + '°',
    'timing-caption': fmt(config.onsetMs, 0) + ' / ' + fmt(config.durationMs, 0) + ' ms',
  };
  for (const [id, text] of Object.entries(labels)) setText(id, text);
  setText('scene-title', clamp ? 'Ideal channel clamp' : 'Light and membrane');
  setText('scene-kicker', clamp ? 'Isopotential channel assay' : 'Reconstructed human neuron');
  setText('geometry-note', clamp
    ? 'Isopotential source-soma patch · no dendrites or native membrane currents in this assay'
    : 'Physical coordinates · fine branches enlarged · synthetic axon stub · light overlay follows replay unless peak field is selected');
  const descriptions = {
    pulse: clamp ? 'A brief pulse reveals activation and deactivation at a fixed voltage.' : 'A single pulse tests optical excitation in a controlled uniform field.',
    train: 'Three complete pulses at 20 Hz in the starting setup. Change the controls to test following and extra events.',
    fiber: 'A finite fiber illuminates the reconstructed cell through a Monte Carlo tissue field.',
    pair: 'Two pulses separated by a dark interval reveal the model’s recovery from desensitization.',
    step: 'A sustained light step reveals transient and persistent channel activity.',
    control: 'Identical illumination with zero ChR2 density. The optical field remains; photocurrent is zero.',
    custom: 'Custom experiment. Run the calculation after changing the setup.',
  };
  setText('preset-note', descriptions[currentPreset] ?? descriptions.custom);
}

function setSourceFromControls() {
  const key = $('aim').value, target = aimPoints[key] ?? config.light.targetUm;
  const distance = Number($('distance').value), az = Number($('azimuth').value) * Math.PI / 180, elevation = Number($('elevation').value) * Math.PI / 180;
  config.light.targetUm = target.slice();
  config.light.positionUm = target.map((v, i) => v + distance * [Math.cos(elevation) * Math.cos(az), Math.cos(elevation) * Math.sin(az), Math.sin(elevation)][i]);
}

function updateNodes() {
  const old = nodes[selected];
  nodes = resolveNodes(model, config);
  selected = old ? nodes.findIndex(n => n.id === old.id && n.areaUm2 > 0) : -1;
  if (selected < 0) selected = nodes.findIndex(n => n.sectionType === 'soma' && n.areaUm2 > 0);
  scene.setNodes(nodes); scene.setSelected(selected);
  const options = [];
  nodes.forEach((node, index) => {
    if (!(node.areaUm2 > 0)) return;
    const option = document.createElement('option'); option.value = index;
    const type = { soma: 'Soma', apic: 'Apical', dend: 'Basal', axon: 'Axon stub' }[node.sectionType] ?? node.sectionType;
    option.textContent = config.mode === 'clamp' ? 'Ideal clamp patch' : type + ' · ' + node.id;
    options.push(option);
  });
  $('compartment').replaceChildren(...options); $('compartment').value = selected;
}

function selectCompartment(index) {
  if (!nodes[index] || !(nodes[index].areaUm2 > 0)) return;
  selected = index; scene.setSelected(index); $('compartment').value = index;
  refreshPlots(); refreshScene();
}

function refreshPlots() {
  const soma = nodes.findIndex(n => n.sectionType === 'soma' && n.areaUm2 > 0);
  const local = i => nodes[i] ? lightAt(nodes[i].centerUm, config.light) : 0;
  plots.setData({
    result, baseline, config, selected, pulses: pulseIntervals(config),
    previewLight: [local(soma), local(selected)],
  });
  $('baseline-key').hidden = !baseline || baseline.config.mode !== config.mode;
}

function refreshScene() {
  const overlay = $('overlay').value;
  const fieldDrive = result && !$('field-peak').checked ? result.lightDrive[frame] : 1;
  scene.setIllumination(fieldDrive);
  let values, maximum = 1;
  if (overlay === 'light') {
    values = result?.lightMwMm2 ?? Float32Array.from(nodes, node => node.areaUm2 > 0 ? lightAt(node.centerUm, config.light) : 0);
    maximum = Math.max(0.001, ...values);
    values = Float32Array.from(values,x=>x*fieldDrive);
    $('legend-gradient').style.background = 'linear-gradient(90deg,#a0aaa5,#145d9a)';
    setText('legend-low', '0'); setText('legend-high', fmt(maximum));
    setText('legend-label',($('field-peak').checked?'Peak':'Local light now')+' · mW/mm² · log color');
  } else if (overlay === 'expression') {
    values = result?.expressionDensityScm2 ?? Float32Array.from(nodes, node => config.conductanceDensityScm2 * (config.mode === 'clamp' ? 1 : expressionFactor(node, config.expression, config.expressionSectionId)));
    $('legend-gradient').style.background = 'linear-gradient(90deg,#a6aaa1 49%,#98743e 50%)';
    setText('legend-low', 'Absent'); setText('legend-high', fmt(config.conductanceDensityScm2 * 1000));
    setText('legend-label', 'Assumed density · mS/cm²');
  } else if (overlay === 'conductance') {
    values = result?.effectiveOpen.subarray(frame * result.n, (frame + 1) * result.n) ?? null;
    $('legend-gradient').style.background = 'linear-gradient(90deg,#9aa497,#ad5d25)';
    setText('legend-low', '0'); setText('legend-high', '1');
    setText('legend-label', 'Effective opening · O₁ + 0.1 O₂');
  } else {
    values = result?.voltageMv.subarray(frame * result.n, (frame + 1) * result.n) ?? null;
    $('legend-gradient').style.background = 'linear-gradient(90deg,#375d81,#598492,#9c9b69,#c28c43,#d15f3b,#ef402f)';
    setText('legend-low', '≤ −90'); setText('legend-high', '≥ +40');
    setText('legend-label', 'Membrane voltage · mV');
  }
  refreshLocalReadouts();
  scene.setValues(values, overlay, { max: maximum });
  scene.setFieldVisible(overlay === 'light');
  if (result) {
    const at = frame * result.n + selected;
    setText('compartment-value', fmt(result.voltageMv[at], 1) + ' mV · ' + fmt(result.photocurrentNa[at], 4) + ' nA');
    setText('scene-state', result.lightDrive[frame] ? 'Recorded · light on' : 'Recorded · light off');
  } else {
    setText('compartment-value', 'Area ' + fmt(nodes[selected]?.areaUm2 ?? 0, 1) + ' µm² · run for response');
    setText('scene-state', busy ? 'Calculating' : 'Setup · no recording');
  }
}

function clearMetrics() {
  if (config.mode === 'clamp') {
    metric('a', 'Peak inward current', '—', 'Ideal patch · calculated at full timestep');
    metric('b', 'Late / peak current', '—', 'First pulse · last saved in-pulse sample');
    metric('c', 'Peak effective opening', '—', 'O₁ + 0.1 O₂ · saved samples');
    metric('d', 'Holding voltage', '—', '843.36 µm² isopotential patch');
  } else {
    metric('a', 'Soma spikes', '—', 'Upward −25 mV crossing · 2 ms refractory');
    metric('b', config.protocol === 'step' ? 'Events during step' : 'Pulse association', '—', 'Awaiting computed events');
    metric('c', config.protocol === 'step' ? 'First spike delay' : 'First pulse latency', '—', 'From illumination onset');
    metric('d', 'Peak photocurrent', '—', 'Total inward magnitude · all compartments');
  }
}
function metric(key, label, value, detail) {
  setText('metric-' + key + '-label', label); setText('metric-' + key, value); setText('metric-' + key + '-detail', detail);
}
function updateMetrics() {
  if (!result) { clearMetrics(); return; }
  const r = result, inward = -r.diagnostics.peakInwardPhotocurrentNa;
  if (config.mode === 'clamp') {
    const pulse = r.pulses[0];
    let peak = 0, atEnd = 0, effective = 0;
    for (let k = 0; k < r.frames; k++) {
      effective = Math.max(effective, r.effectiveOpen[k]);
      if (r.timeMs[k] >= pulse.startMs && r.timeMs[k] <= pulse.endMs + 1e-8) { peak = Math.max(peak, -r.totalPhotocurrentNa[k]); atEnd = -r.totalPhotocurrentNa[k]; }
    }
    metric('a', 'Peak inward current', fmt(inward, 3) + ' nA', 'Ideal patch · calculated at full timestep');
    metric('b', 'Late / peak current', peak > 0 ? fmt(atEnd / peak * 100, 1) + '%' : '—', 'Last first-pulse sample · ' + fmt(config.sampleMs) + ' ms sampling');
    metric('c', 'Peak effective opening', fmt(effective * 100, 1) + '%', 'O₁ + 0.1 O₂ · saved samples');
    metric('d', 'Holding voltage', fmt(config.clampMv, 0) + ' mV', '843.36 µm² isopotential patch');
  } else {
    const m = r.pulseMetrics;
    metric('a', 'Soma spikes', String(r.spikes.length), 'Upward −25 mV crossing · 2 ms refractory');
    if (config.protocol === 'step') {
      const events = r.spikes.filter(s => s.timeMs >= r.pulses[0].startMs && s.timeMs < r.pulses[0].endMs);
      metric('b', 'Events during step', String(events.length), 'Counts within the illumination interval');
      const first = r.spikes.find(s => s.timeMs >= config.onsetMs);
      metric('c', 'First spike delay', first ? fmt(first.timeMs - config.onsetMs) + ' ms' : '—', 'From illumination onset');
    } else {
      metric('b', 'Pulse association', m.matchedPulses + ' / ' + m.pulseCount, m.exactlyOnePulses+' exactly-one · '+m.extraEvents+' extra events');
      metric('c', 'First pulse latency', m.associations[0]?.matched ? fmt(m.associations[0].latencyMs) + ' ms' : '—', m.associations[0]?.matched ? 'First associated event after pulse 1' : 'No event in the first association window');
    }
    metric('d', 'Peak photocurrent', fmt(inward, 3) + ' nA', 'Total inward magnitude · all compartments');
  }
  let note = 'Computed response at ' + fmt(config.dtMs, 3) + ' ms maximum timestep; traces saved every ' + fmt(config.sampleMs) + ' ms. Photocurrent traces are per compartment; the total is included in exports.';
  if (config.mode === 'neuron') note += ' Pulse associations use the first event within 20 ms or before the next onset; other events count as extras.';
  if (r.diagnostics.opticalKernelOutsideCount) note += ' ' + r.diagnostics.opticalKernelOutsideCount + ' membrane compartments are outside the stored optical field and receive zero modeled exposure.';
  if (config.light.kind === 'fiber') note += ' Exposure is sampled at compartment centers; use the 20 µm mesh to examine spatial sensitivity.';
  if (baseline) note += ' The dashed baseline shows its saved soma / patch response.';
  setText('trace-note', note); renderDiagnostics();
}

function frameAtTime(time, nearestSample = false) {
  if (!result || time <= 0) return 0;
  const times = result.timeMs;
  if (time >= times[times.length - 1]) return times.length - 1;
  let low = 0, high = times.length - 1;
  while (high - low > 1) { const middle = (low + high) >> 1; if (times[middle] <= time) low = middle; else high = middle; }
  return nearestSample && times[high] - time < time - times[low] ? high : low;
}
function setFrame(next) {
  if (!result) return;
  frame = Math.max(0, Math.min(result.frames - 1, next)); playMs = result.timeMs[frame];
  $('scrubber').value = frame; setText('replay-time', fmt(result.timeMs[frame]) + ' ms');
  plots.setCursor(result.timeMs[frame]); refreshScene();
}
function pause() { playing = false; setText('play', 'Play'); $('play').setAttribute('aria-label', 'Play computed recording'); }
function playback(now) {
  if (!playing || !result) return;
  playMs += (now - lastPlayTime) * Number($('speed').value); lastPlayTime = now;
  const time = playMs;
  setFrame(frameAtTime(time));
  playMs = time;
  if (time >= result.config.durationMs) pause(); else requestAnimationFrame(playback);
}
function invalidate(message = 'Setup changed. Run the experiment to calculate a new recording.', rebuildNodes = false) {
  pause(); result = null; frame = 0;
  if (rebuildNodes) updateNodes();
  scene.setLight(config.light);
  $('scrubber').disabled = true; $('scrubber').value = 0; $('play').disabled = true;
  $('pin').disabled = true; $('export-csv').disabled = true; $('export-result').disabled = true;
  setText('replay-time', '0.00 ms'); setText('run-status', message);
  setText('trace-note', baseline ? 'Pinned soma / patch recording retained. Run this setup to compare.' : 'Run an experiment to calculate membrane voltage and photocurrent.');
  $('pulse-table-body').replaceChildren();setText('pulse-table-note','Run the current setup to calculate pulse associations.');$('events-panel').hidden=true; $('diagnostic-detail').replaceChildren();
  clearMetrics(); plots.setCursor(0); refreshPlots(); refreshScene();
}
function setBusy(value) {
  busy = value; $('lab').classList.toggle('busy', busy); $('run').disabled = busy;
  $('cancel').hidden = !busy; $('progress-track').hidden = !busy;
  for (const id of controlIds) $(id).disabled = busy;
  $('import-config').disabled = busy;
  for(const id of ['run-sweep','sweep-levels','sweep-widths','aim-selected','express-selected','match-exposure']) $(id).disabled=busy;
  $('cancel-sweep').hidden=!(busy && activeJob==='sweep');
  if (!busy) syncControls();
  refreshScene();
}
function stopCalculation() {
  if(activeJob==='sweep')setText('sweep-status','Map cancelled. '+sweepResults.filter(Boolean).length+' completed trials retained. Select a completed cell to inspect it.');
  jobId++; if (worker) worker.terminate(); worker = null;
  if (workerUrl) URL.revokeObjectURL(workerUrl); workerUrl = null;
  setBusy(false); if(activeJob==='sweep')renderSweep(); invalidate('Calculation cancelled. The setup is ready to run again.');
}
function getWorker() {
  if (worker) return worker;
  workerUrl = URL.createObjectURL(new Blob([$('worker-source').textContent], { type: 'text/javascript' }));
  worker = new Worker(workerUrl);
  worker.onmessage = event => {
    const data = event.data;
    if (data.id !== jobId) return;
    if (data.type === 'progress') {
      if(activeJob==='sweep')setText('sweep-status',data.stage+' · '+Math.round(data.progress*100)+'%');
      $('progress-fill').style.width = Math.round(data.progress * 100) + '%';
      setText('run-status', data.stage + ' · ' + Math.round(data.progress * 100) + '%');
    } else if (data.type === 'result') {
      acceptResult(data.result);
    } else if (data.type === 'sweep-item') {
      sweepResults[data.index]=data.result; renderSweep(); $('export-sweep').disabled=false;
    } else if (data.type === 'sweep-done') {
      setBusy(false);renderSweep();setText('sweep-status',`${data.total} computed trials retained. Select a cell to open its actual voltage, current and compartment recordings.`);
      setText('run-status','Response map complete. Select a cell to inspect a trial, or run the current main setup.');
    } else if (data.type === 'error') {
      setBusy(false); if(activeJob==='sweep'){renderSweep();setText('sweep-status','Calculation stopped: '+data.message+' Completed trials remain available.');} showError(data.message); setText('run-status', 'Calculation stopped. Adjust the setup and run again.'); refreshScene();
    }
  };
  worker.onerror = event => {
    if(activeJob==='sweep')setText('sweep-status','The browser worker stopped. Completed trials remain available.');
    setBusy(false); showError('The calculation worker could not run: ' + (event.message || 'browser worker error') + '. Download the HTML and open it in a current browser if an embedded preview blocks scripts.');
    if (worker) worker.terminate(); worker = null;
    if (workerUrl) URL.revokeObjectURL(workerUrl); workerUrl = null;
    refreshScene();
  };
  worker.postMessage({ type: 'init', model });
  return worker;
}
function run() {
  if (busy) return;
  clearError(); activeJob='run';
  try {
    config = validateConfig(config);
    invalidate('Starting the calculation…'); setBusy(true); $('progress-fill').style.width = '0%';
    getWorker().postMessage({ type: 'run', id: ++jobId, config });
  } catch (error) { setBusy(false); showError(error.message); setText('run-status', 'The setup needs an adjustment.'); }
}

function applyPreset(name) {
  if (name === 'control') {
    config.conductanceDensityScm2 = 0; currentPreset = name;
    syncControls(); clearError(); invalidate('No-expression control loaded. Illumination and timing are retained.');
    return;
  }
  const mode = config.mode, base = cloneDefault();
  config = { ...base, mode, protocol: 'train' };
  currentPreset = name;
  if (name === 'pulse') config.protocol = 'single';
  if (name === 'fiber') {
    config.light.kind = 'fiber'; config.light.powerMw = 0.05;
    config.light.targetUm = aimPoints.soma.slice();
    config.light.positionUm = [-108, -90, 51];
  }
  if (name === 'pair') { config.protocol = 'paired'; config.pulseWidthMs = mode === 'clamp' ? 20 : 5; config.pairGapMs = 50; }
  if (name === 'step') { config.protocol = 'step'; config.trainDurationMs = 100; }
  if (mode === 'clamp') { config.light.kind = 'uniform'; config.expression = 'all'; }
  syncControls(); clearError(); invalidate('Starting experiment loaded. Run to calculate its response.', true);
}
function editControl(id) {
  if (busy) return;
  clearError(); currentPreset = 'custom';
  const v = Number($(id).value);
  if (id === 'source') config.light.kind = $('source').value;
  if (id === 'irradiance') config.light.irradianceMwMm2 = v;
  if (id === 'power') config.light.powerMw = v;
  if (id === 'density') config.conductanceDensityScm2 = v / 1000;
  if (id === 'expression') { config.expression = $('expression').value; if(config.expression==='section')config.expressionSectionId=nodes[selected].sectionId; }
  if (id === 'protocol') {
    config.protocol = $('protocol').value;
    config.trainDurationMs = config.protocol === 'step' ? 100 : 150;
    config.durationMs = Math.max(config.durationMs, config.onsetMs + config.trainDurationMs + 40);
  }
  if (id === 'width') {
    if (config.protocol === 'step') config.trainDurationMs = v;
    else config.pulseWidthMs = v;
  }
  if (id === 'onset') config.onsetMs=v;
  if (id === 'epoch') config.trainDurationMs=v;
  if (id === 'record-duration') config.durationMs=v;
  if (id === 'frequency') config.frequencyHz = v;
  if (id === 'gap') config.pairGapMs = v;
  if (id === 'clamp-mv') config.clampMv = v;
  if (id === 'mesh') config.segmentLengthUm = v;
  if (id === 'timestep') config.dtMs = v;
  if (['aim', 'distance', 'azimuth', 'elevation'].includes(id)) setSourceFromControls();
  const protocolEnd = config.onsetMs + (config.protocol === 'step' || config.protocol === 'train' ? config.trainDurationMs : config.protocol === 'paired' ? 2 * config.pulseWidthMs + config.pairGapMs : config.pulseWidthMs);
  config.durationMs = Math.min(1000, Math.max(config.durationMs, protocolEnd + 40));
  syncControls(); invalidate(undefined, id === 'mesh');
  try { validateConfig(config); } catch (error) { showError(error.message); }
}
function switchWorkspace(mode) {
  $('advanced-panel').hidden=mode!=='advanced';
  if(mode==='advanced'){if(busy)stopCalculation();pause();currentWorkspace=mode;$('experiment-panel').hidden=true;$('evidence-panel').hidden=true;$('sweep-panel').hidden=true;}
  else if (['evidence','sweep'].includes(mode)) {
    currentWorkspace=mode; $('experiment-panel').hidden=true; $('evidence-panel').hidden=mode!=='evidence'; $('sweep-panel').hidden=mode!=='sweep';
    if(mode==='sweep')renderSweep();

  } else {
    if (config.mode !== mode) {
      if (busy) stopCalculation();
      if (config.mode === 'neuron') savedNeuron = { config: copy(config), preset: currentPreset };
      else savedClamp = { config: copy(config), preset: currentPreset };
      const saved = mode === 'neuron' ? savedNeuron : savedClamp;
      if (saved) { config = saved.config; currentPreset = saved.preset; }
      else {
        config = { ...cloneDefault(), mode, protocol: mode === 'clamp' ? 'step' : 'train', trainDurationMs: mode === 'clamp' ? 100 : 150 };
        currentPreset = mode === 'clamp' ? 'step' : 'train';
      }
      baseline = null; setText('pin', 'Pin baseline'); syncControls(); invalidate('Workspace ready. Run to calculate its response.', true); scene.fit();
    }
    currentWorkspace = mode; $('sweep-panel').hidden=true; $('experiment-panel').hidden = false; $('evidence-panel').hidden = true;
    requestAnimationFrame(() => { refreshPlots(); refreshScene(); });
  }
  for (const name of ['neuron', 'clamp', 'sweep', 'evidence','advanced']) {
    $('tab-' + name).classList.toggle('active', name === mode); $('tab-' + name).setAttribute('aria-pressed', String(name === mode));
  }
}

function download(filename, content, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function setupDocument() {
  return { schema: 'opto-lab-setup/1', modelVersion: MODEL_VERSION, modelId: model.id, sourceCommit: model.sourceCommit,
    config: copy(validateConfig(config)), provenance: 'Computed simulation setup; assumed opsin density. See Model & evidence.' };
}
function exportCsv() {
  if (!result) return;
  const r = result, s = r.somaIndex, chosen = selected;
  const header = ['time_ms', 'light_on', 'soma_light_mW_mm2', 'selected_light_mW_mm2', 'soma_voltage_mV', 'selected_voltage_mV',
    'soma_photocurrent_nA', 'selected_photocurrent_nA', 'total_photocurrent_nA', 'soma_effective_open', 'selected_effective_open',
    'selected_compartment_id', 'model_version', 'source_commit', 'config_json'];
  const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
  const rows = [header.join(',')];
  for (let k = 0; k < r.frames; k++) {
    const at = k * r.n;
    rows.push([r.timeMs[k], r.lightDrive[k], r.lightMwMm2[s] * r.lightDrive[k], r.lightMwMm2[chosen] * r.lightDrive[k],
      r.somaVoltageMv[k], r.voltageMv[at + chosen], r.photocurrentNa[at + s], r.photocurrentNa[at + chosen], r.totalPhotocurrentNa[k],
      r.effectiveOpen[at + s], r.effectiveOpen[at + chosen], quote(r.nodes[chosen].id), quote(r.version), quote(r.sourceCommit),
      k === 0 ? quote(JSON.stringify(r.config)) : ''].join(','));
  }
  download('optogenetics-traces.csv', rows.join('\r\n'), 'text/csv;charset=utf-8');
}
function renderEvidence() {
  const host=$('validation-summary'); const current=JSON.parse($('current-validation-data')?.textContent||'{}');
  const grid=document.createElement('div');grid.className='check-grid';
  const add=(title,detail)=>{const box=document.createElement('div'),h=document.createElement('strong'),p=document.createElement('p');h.textContent=title;p.textContent=detail;box.append(h,p);grid.append(box);};
  add('Current software checks',current.softwareSummary||'Executable protocol, state, optical-unit and browser regression tests are included with the source. Consult validation/ for the checks executed on this edition.');
  add('Channel reference',current.channelSummary||'Fresh SciPy reference integration checks the published differential equations independently of the JavaScript time integrator. No biological fit is implied.');
  add('Optical-field boundary', 'The recovered field is retained exactly. Its absorption integral and geometric sampling are checked. Original photon-seed raw tallies and original generator are not recovered; the archived two-seed report is not a new rerun or MCX validation.');
  const note=document.createElement('p');note.textContent=current.couplingSummary||'The human membrane solver is retained from the earlier build. KCL and refinement checks test numerical behavior. Independent validation of the combined human-cell + opsin + tissue-optics system remains pending.';
  host.replaceChildren(grid,note);
}

function acceptResult(next) {
  result=next;setBusy(false);
  $('scrubber').disabled=false;$('scrubber').max=result.frames-1;
  for(const id of ['play','pin','export-csv','export-result'])$(id).disabled=false;
  setText('run-status',`Calculated ${result.frames} saved frames in ${fmt(result.diagnostics.computationMs/1000,1)} s. Select a branch or replay the recording.`);
  refreshPlots();updateMetrics();
  let best=0;
  for(let k=1;k<result.frames;k++)if(config.mode==='clamp'?result.totalPhotocurrentNa[k]<result.totalPhotocurrentNa[best]:result.somaVoltageMv[k]>result.somaVoltageMv[best])best=k;
  setFrame(best);
}
function refreshLocalReadouts() {
  const node=nodes[selected]; if(!node)return;
  const local=result?.lightMwMm2[selected]??lightAt(node.centerUm,config.light);
  const drive=result?result.lightDrive[frame]:1;
  const onMs=pulseIntervals(config).reduce((sum,p)=>sum+p.endMs-p.startMs,0);
  setText('local-light',fmt(local*drive,3)+' mW/mm²'+(result?'':' · preview'));
  setText('local-dose',fmt(local*onMs,3)+' µJ/mm²');
  setText('local-open',result?fmt(result.effectiveOpen[frame*result.n+selected]*100,2)+'%':'Run to calculate');
  setText('source-energy',config.mode==='neuron'&&config.light.kind==='fiber'?fmt(config.light.powerMw*onMs,3)+' µJ':'Not defined for uniform field');
  $('match-exposure').textContent='Match here to '+fmt(config.light.irradianceMwMm2)+' mW/mm²';
  for(const id of ['aim-selected','express-selected','match-exposure'])$(id).disabled=busy||config.mode==='clamp';
  $('channel-states').hidden=config.mode!=='clamp';
  const host=$('state-probabilities');host.replaceChildren();
  if(result?.opsinStates){
    ['C₁','O₁','O₂','C₂','p'].forEach((name,i)=>{
      const box=document.createElement('div'),label=document.createElement('span'),v=document.createElement('strong'),bar=document.createElement('progress');
      const value=result.opsinStates[frame*5+i];label.textContent=name;v.textContent=fmt(value*100,2)+'%';bar.max=1;bar.value=value;bar.setAttribute('aria-label',name+' occupancy');box.append(label,v,bar);host.append(box);
    });
  }
}
function renderDiagnostics() {
  if(!result)return;
  const r=result,d=r.diagnostics,host=$('diagnostic-detail');host.replaceChildren();
  const dl=document.createElement('dl');
  const entries=[['Model release',r.version],['Membrane / junction nodes',r.nodes.filter(n=>n.areaUm2>0).length+' / '+r.nodes.filter(n=>n.areaUm2===0).length],['Maximum timestep',fmt(r.config.dtMs,4)+' ms'],['Saved sample interval',fmt(r.config.sampleMs,3)+' ms'],['Integration steps',d.integrationSteps.toLocaleString()],['Maximum discrete KCL residual',d.maximumKclResidualNa.toExponential(3)+' nA'],['Maximum tangent-current discrepancy',d.maximumLinearizedCurrentErrorNa.toExponential(3)+' nA'],['Final opsin probability-sum error',d.maximumProbabilitySumError.toExponential(3)],['Outside optical kernel',d.opticalKernelOutsideCount+' membrane compartments'],['Conditioning',d.conditioningMs+' ms · '+(d.conditioning||'not applicable')]];
  for(const [label,value]of entries){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);dl.append(dt,dd);}host.append(dl);
  const ul=document.createElement('ul');for(const text of d.limitations){const li=document.createElement('li');li.textContent=text;ul.append(li);}host.append(ul);
  if(r.config.light.kind==='fiber'){const p=document.createElement('p');p.textContent='Fiber exposure is scalar fluence rate sampled at compartment centers. The center-sampling approximation, 25 µm optical voxels, finite stored field and transfer of the channel-calibration loss factor are model limitations. The optical display and solver use the same field sampler.';host.append(p);}
  $('events-panel').hidden=r.config.mode==='clamp';
  const tbody=$('pulse-table-body');tbody.replaceChildren();
  if(r.pulseMetrics){for(const a of r.pulseMetrics.associations){
    const tr=document.createElement('tr');
    for(const value of [a.pulse,fmt(a.onsetMs,2),a.eventCount,fmt(a.latencyMs,3),a.eventCount===0?'Missed':a.eventCount===1?'Exactly one':'Extra events']){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}tbody.append(tr);
  }
  setText('pulse-table-note',r.pulseMetrics.convention+' '+r.pulseMetrics.extraEvents+' total unassigned event(s); exactly-one fraction '+fmt(r.pulseMetrics.exactlyOneFraction*100,1)+'%. Long-step events after the association window are counted as extra, not missed by the event detector.');}
}
function renderSweep() {
  const host=$('response-map');host.replaceChildren();if(!sweepSpec)return;
  const table=document.createElement('table'),thead=document.createElement('thead'),head=document.createElement('tr');
  const corner=document.createElement('th');corner.textContent='Light ↓ / width →';head.append(corner);
  for(const width of sweepSpec.pulseWidths){const th=document.createElement('th');th.textContent=width+' ms';head.append(th);}thead.append(head);table.append(thead);
  const body=document.createElement('tbody');
  sweepSpec.lightLevels.forEach((level,row)=>{
    const tr=document.createElement('tr'),th=document.createElement('th');th.textContent=level+' mW/mm²';tr.append(th);
    sweepSpec.pulseWidths.forEach((width,col)=>{
      const index=row*sweepSpec.pulseWidths.length+col,trial=sweepResults[index],td=document.createElement('td'),button=document.createElement('button');
      button.type='button';button.disabled=!trial||busy;
      if(trial){const summary=summarizeTrial(trial),large=document.createElement('strong'),small=document.createElement('small');
        button.className='map-'+summary.category;large.textContent=summary.spikeCount;
        small.textContent=summary.latencyMs===null?'No post-onset event':fmt(summary.latencyMs,2)+' ms first latency';button.append(large,small);
        button.setAttribute('aria-label',`${level} mW/mm², ${width} ms: ${summary.spikeCount} spike events. Inspect recording.`);
        button.addEventListener('click',()=>{
          if(busy)return;switchWorkspace('neuron');config=copy(trial.config);currentPreset='custom';syncControls();updateNodes();scene.setLight(config.light);acceptResult(trial);scene.fit();
          $('experiment-panel').scrollIntoView({behavior:'instant',block:'start'});
        });
      }else button.textContent=busy?'Pending':'Not calculated';
      td.append(button);tr.append(td);
    });body.append(tr);
  });table.append(body);host.append(table);
}
function runSweep() {
  if(busy)return;pause();clearError();
  try{
    sweepSpec=createSweep(model,config,$('sweep-levels').value,$('sweep-widths').value);sweepResults=[];activeJob='sweep';
    $('export-sweep').disabled=true;setBusy(true);renderSweep();
    setText('sweep-contract',sweepSpec.convention+' Density: '+fmt(config.conductanceDensityScm2*1000)+' mS/cm²; distribution: '+config.expression+'; mesh: '+config.segmentLengthUm+' µm; dt: '+config.dtMs+' ms. All computed traces are retained.');
    setText('sweep-status','Starting '+sweepSpec.trials.length+' independent trials…');
    getWorker().postMessage({type:'sweep',id:++jobId,config,levels:sweepSpec.lightLevels,widths:sweepSpec.pulseWidths});
  }catch(error){setBusy(false);setText('sweep-status',error.message);}
}
$('run-sweep').addEventListener('click',runSweep);
$('cancel-sweep').addEventListener('click',stopCalculation);
$('export-sweep').addEventListener('click',()=>{
  const rows=[['light_mW_mm2','pulse_width_ms','spike_count','first_latency_ms','peak_voltage_mV','peak_inward_current_nA','dose_uJ_mm2','config_json'].join(',')];
  for(const r of sweepResults.filter(Boolean)){const s=summarizeTrial(r);rows.push([s.lightMwMm2,s.widthMs,s.spikeCount,s.latencyMs??'',s.peakVoltageMv,s.peakInwardCurrentNa,s.localDoseUjMm2,'"'+JSON.stringify(r.config).replaceAll('"','""')+'"'].join(','));}
  download('optogenetics-response-map.csv',rows.join('\r\n'),'text/csv;charset=utf-8');
});
$('aim-selected').addEventListener('click',()=>{
  if(busy||!nodes[selected])return;
  const delta=config.light.positionUm.map((x,i)=>x-config.light.targetUm[i]);
  if(Math.hypot(...delta)<1)delta.splice(0,3,-150,0,0);
  config.light.targetUm=nodes[selected].centerUm.slice();config.light.positionUm=delta.map((x,i)=>x+config.light.targetUm[i]);config.light.kind='fiber';
  currentPreset='custom';syncControls();clearError();invalidate('Fiber aimed at the selected compartment. The field has been recalculated; run for the membrane response.');
  $('overlay').value='light';refreshScene();
});
$('express-selected').addEventListener('click',()=>{
  if(busy||!nodes[selected])return;config.expression='section';config.expressionSectionId=nodes[selected].sectionId;
  currentPreset='custom';syncControls();clearError();invalidate('Expression restricted to '+config.expressionSectionId+'. Illumination is unchanged.');$('overlay').value='expression';refreshScene();
});
$('match-exposure').addEventListener('click',()=>{
  if(busy||!nodes[selected])return;clearError();
  try{
    if(config.light.kind!=='fiber')throw new Error('Select a fiber source first. Set the uniform-light value to the desired reference exposure.');
    const perMw=lightAt(nodes[selected].centerUm,{...config.light,powerMw:1});
    if(perMw<=1e-10)throw new Error('This compartment is outside the sampled optical field; reposition the source.');
    const power=config.light.irradianceMwMm2/perMw;
    if(power>1)throw new Error('Matching this exposure needs more than the supported 1 mW. Move the fiber closer or lower the uniform reference.');
    config.light.powerMw=power;currentPreset='custom';syncControls();invalidate('Fiber power matched to the uniform reference at the selected compartment only. Other compartments retain their different local exposures.');
  }catch(error){showError(error.message);}
});


for (const id of controlIds.filter(id => id !== 'preset')) $(id).addEventListener($(id).tagName === 'SELECT' ? 'change' : 'input', () => editControl(id));
$('preset').addEventListener('change', () => { if ($('preset').value !== 'custom') applyPreset($('preset').value); });
for (const name of ['neuron', 'clamp', 'sweep', 'evidence']) $('tab-' + name).addEventListener('click', () => switchWorkspace(name));
$('run').addEventListener('click', run); $('cancel').addEventListener('click', stopCalculation);
$('overlay').addEventListener('change', refreshScene);
$('field-peak').addEventListener('change',refreshScene);
$('compartment').addEventListener('change', () => selectCompartment(Number($('compartment').value)));
$('scrubber').addEventListener('input', () => { pause(); setFrame(Number($('scrubber').value)); });
$('play').addEventListener('click', () => {
  if (playing) { pause(); return; }
  if (!result) return;
  if (frame >= result.frames - 1) setFrame(0);
  playing = true; lastPlayTime = performance.now(); playMs = result.timeMs[frame];
  setText('play', 'Pause'); $('play').setAttribute('aria-label', 'Pause computed recording'); requestAnimationFrame(playback);
});
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  scene.setView(button.dataset.view);
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
$('fit-view').addEventListener('click', () => scene.fit());
$('toggle-controls').addEventListener('click', () => {
  const expanded = $('experiment-controls').dataset.expanded !== 'true';
  $('experiment-controls').dataset.expanded = String(expanded);
  $('toggle-controls').setAttribute('aria-expanded', String(expanded));
  $('toggle-controls').textContent = expanded ? 'Hide experiment controls −' : 'Experiment controls +';
});
$('pin').addEventListener('click', () => { if (result) { baseline = result; setText('pin', 'Replace baseline'); refreshPlots(); updateMetrics(); } });
$('clear-baseline').addEventListener('click', () => { baseline = null; setText('pin', 'Pin baseline'); refreshPlots(); if (result) updateMetrics(); });
$('export-config').addEventListener('click', () => {
  try { download('optogenetics-setup.json', JSON.stringify(setupDocument(), null, 2), 'application/json'); } catch (error) { showError(error.message); }
});
$('export-csv').addEventListener('click', exportCsv);
$('export-result').addEventListener('click', () => {
  if (!result) return;
  const payload = { schema: 'opto-lab-result/1', arrayLayout: 'Compartment recordings are flattened frame-major: index = frame * n + compartment.',
    selectedCompartmentIndex: selected, ...result };
  download('optogenetics-result.json', JSON.stringify(payload, (_, value) => ArrayBuffer.isView(value) ? Array.from(value) : value), 'application/json');
});
$('import-config').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  clearError();
  try {
    if (file.size > 30 * 1024 * 1024) throw new Error('Load a setup JSON smaller than 30 MB.');
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected an experiment setup object.');
    if (parsed.schema && !['opto-lab-setup/1', 'opto-lab-result/1'].includes(parsed.schema)) throw new Error('Unsupported experiment file schema.');
    const input = parsed.config ?? parsed;
    if (!input || typeof input !== 'object' || !input.mode || !input.protocol || !input.light) throw new Error('The JSON does not contain an experiment configuration.');
    if (parsed.modelId && parsed.modelId !== model.id) throw new Error('This setup belongs to a different neuron model.');
    if (parsed.sourceCommit && parsed.sourceCommit !== model.sourceCommit) throw new Error('This setup uses a different source model revision.');
    const imported = validateConfig(input);
    if (imported.mode === 'clamp') { imported.light.kind = 'uniform'; imported.expression = 'all'; }
    if (busy) stopCalculation();
    if (config.mode !== imported.mode) switchWorkspace(imported.mode);
    config = imported; currentPreset = 'custom'; syncControls(); invalidate('Setup loaded. Run to calculate the recording.', true);
  } catch (error) { showError('Could not load the setup: ' + error.message); }
  event.target.value = '';
});
let theme = 'light';
try { theme = localStorage.getItem('bts-opto-theme') === 'dark' ? 'dark' : 'light'; } catch {}
function applyTheme() {
  document.documentElement.dataset.theme = theme; scene.setTheme(theme); setText('theme', theme === 'dark' ? 'Light' : 'Dark');
  $('theme').setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' appearance');
}
$('theme').addEventListener('click', () => {
  theme = theme === 'light' ? 'dark' : 'light'; applyTheme();
  try { localStorage.setItem('bts-opto-theme', theme); } catch {}
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('beforeunload', () => { worker?.terminate(); if (workerUrl) URL.revokeObjectURL(workerUrl); });
applyTheme(); syncControls(); updateNodes(); scene.setLight(config.light); renderEvidence(); invalidate('Ready. Calculating the starting pulse train…');
if(globalThis.OPTO_REVIEW_OPTIONS?.legacyAutoRun)setTimeout(run, 180);else setText('run-status','Ready. Run to calculate the first recording.');
// Documented inspection API for automated regression and embedding; all edits validate and invalidate old output.
globalThis.OptoLab=Object.freeze({version:MODEL_VERSION, getConfig:()=>copy(config),getResult:()=>result,getSweep:()=>sweepResults.slice(),isBusy:()=>busy,run,cancel:stopCalculation,
setConfig(input){if(busy)throw new Error('Cancel the active calculation first.');const next=validateConfig(input);if(next.mode!==config.mode)switchWorkspace(next.mode);config=next;currentPreset='custom';syncControls();invalidate('Setup loaded through the validated API. Run to calculate.',true);},
setTime(time){pause();setFrame(frameAtTime(time,true));}});
initAdvanced(model,()=>switchWorkspace('advanced'));
