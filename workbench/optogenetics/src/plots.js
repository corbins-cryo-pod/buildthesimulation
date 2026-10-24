/** Synchronized SVG recordings. Every response trace comes from a solver result. */
const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, text = '') => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
};
const number = x => Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : Math.abs(x) >= 0.1 ? x.toFixed(2) : x === 0 ? '0' : x.toPrecision(2);
const valueAt = (array, result, index) => Array.from(result.timeMs, (_, k) => array[k * result.n + index]);

 function createRecordingPlots(containers, onScrub = () => {}) {
  let state = { result: null, baseline: null, config: null, selected: 0, pulses: [] }, cursorMs = 0;
  const layouts = new Map();

  function base(container, title, height, duration, domain) {
    const width = Math.max(275, Math.round(container.getBoundingClientRect().width || 680));
    const left = 55, right = 14, top = 28, bottom = 29;
    const x = t => left + t / duration * (width - left - right);
    const y = value => top + (domain[1] - value) / (domain[1] - domain[0]) * (height - top - bottom);
    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': title });
    svg.append(el('text', { x: left, y: 15, fill: 'var(--ink)' }, title));
    for (let k = 0; k <= 4; k++) {
      const t = k * duration / 4;
      svg.append(el('line', { x1: x(t), x2: x(t), y1: top, y2: height - bottom, stroke: 'var(--rule)', opacity: 0.35 }));
      svg.append(el('text', { x: x(t), y: height - 10, 'text-anchor': 'middle' }, `${Math.round(t * 10) / 10}`));
    }
    for (const v of [domain[0], (domain[0] + domain[1]) / 2, domain[1]]) {
      svg.append(el('line', { x1: left, x2: width - right, y1: y(v), y2: y(v), stroke: 'var(--rule)', opacity: v === 0 ? 0.7 : 0.28 }));
      svg.append(el('text', { x: left - 9, y: y(v) + 4, 'text-anchor': 'end' }, number(v)));
    }
    for (const p of state.pulses) svg.append(el('rect', { x: x(p.startMs), y: top, width: Math.max(0.3, x(p.endMs) - x(p.startMs)), height: height - top - bottom, fill: 'var(--blue)', opacity: 0.07 }));
    svg.append(el('text', { x: width - right, y: 15, 'text-anchor': 'end' }, 'time · ms'));
    const cursor = el('line', { class: 'time-cursor', x1: x(cursorMs), x2: x(cursorMs), y1: top, y2: height - bottom, stroke: 'var(--brass)', 'stroke-width': 1, opacity: state.result ? 0.8 : 0 });
    container.replaceChildren(svg);
    layouts.set(container, { svg, x, y, cursor, duration, left, right, width, height });
    let dragging = false;
    const scrub = event => {
      if (!state.result) return;
      const rect = svg.getBoundingClientRect();
      const local = (event.clientX - rect.left) * width / rect.width;
      onScrub(Math.max(0, Math.min(state.result.config.durationMs, (local - left) / (width - left - right) * duration)));
    };
    svg.addEventListener('pointerdown', event => { dragging = true; svg.setPointerCapture(event.pointerId); scrub(event); });
    svg.addEventListener('pointermove', event => { if (dragging) scrub(event); });
    svg.addEventListener('pointerup', () => { dragging = false; });
    svg.addEventListener('pointercancel', () => { dragging = false; });
    svg.style.touchAction = 'pan-y';
    return { svg, x, y, cursor, left, width, height };
  }

  function path(svg, x, y, times, values, color, dash = false) {
    let d = '';
    for (let i = 0; i < times.length; i++) {
      if (!Number.isFinite(values[i])) continue;
      d += `${d ? 'L' : 'M'}${x(times[i]).toFixed(2)},${y(values[i]).toFixed(2)}`;
    }
    svg.append(el('path', { d, fill: 'none', stroke: color, 'stroke-width': 1.6, 'stroke-linejoin': 'round', ...(dash ? { 'stroke-dasharray': '5 4', opacity: 0.9 } : {}) }));
  }

  function pulsePath(svg, x, y, pulses, peak, duration, color, dash = false) {
    const times = [0], values = [0];
    for (const p of pulses) { times.push(p.startMs, p.startMs, p.endMs, p.endMs); values.push(0, peak, peak, 0); }
    times.push(duration); values.push(0);
    path(svg, x, y, times, values, color, dash);
  }

  function drawTrace(container, title, series, duration, fixedDomain) {
    let lo = 0, hi = 0;
    for (const s of series) for (const v of s.values) if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const span = hi - lo || 0.01;
    const domain = fixedDomain ?? [lo - span * 0.1, hi + span * 0.1];
    const { svg, x, y, cursor, left, width } = base(container, title, 142, duration, domain);
    for (const s of series) path(svg, x, y, s.time, s.values, s.color, s.dash);
    if (!state.result) svg.append(el('text', { x: (width + left) / 2, y: 77, class: 'empty-label', 'text-anchor': 'middle' }, state.baseline ? 'Pinned baseline · run the new setup to compare' : 'Awaiting computed recording'));
    svg.append(cursor);
  }

  function render() {
    const r = state.result, b = state.baseline?.config.mode === state.config?.mode ? state.baseline : null;
    const duration = Math.max(state.config?.durationMs ?? 250, b?.config.durationMs ?? 0);
    const soma = r?.somaIndex ?? 0, selected = r ? Math.min(state.selected, r.n - 1) : 0;
    const localSoma = r?.lightMwMm2[soma] ?? state.previewLight?.[0] ?? 0;
    const localSelected = r?.lightMwMm2[selected] ?? state.previewLight?.[1] ?? localSoma;
    const ymax = Math.max(0.1, localSoma, localSelected, b?.lightMwMm2[b.somaIndex] ?? 0) * 1.12;
    const light = base(containers.light, 'Local exposure · mW/mm²', 120, duration, [0, ymax]);
    if (b) pulsePath(light.svg, light.x, light.y, b.pulses, b.lightMwMm2[b.somaIndex], b.config.durationMs, 'var(--brass)', true);
    pulsePath(light.svg, light.x, light.y, state.pulses, localSoma, state.config?.durationMs ?? duration, 'var(--ink)');
    if (selected !== soma && r || !r && localSelected !== localSoma)
      pulsePath(light.svg, light.x, light.y, state.pulses, localSelected, state.config?.durationMs ?? duration, 'var(--blue)');
    light.svg.append(light.cursor);
    const volt = [], photo = [];
    if (b) {
      volt.push({ time: b.timeMs, values: b.somaVoltageMv, color: 'var(--brass)', dash: true });
      photo.push({ time: b.timeMs, values: valueAt(b.photocurrentNa, b, b.somaIndex), color: 'var(--brass)', dash: true });
    }
    if (r) {
      volt.push({ time: r.timeMs, values: r.somaVoltageMv, color: 'var(--ink)' });
      photo.push({ time: r.timeMs, values: valueAt(r.photocurrentNa, r, soma), color: 'var(--ink)' });
      if (selected !== soma) {
        volt.push({ time: r.timeMs, values: valueAt(r.voltageMv, r, selected), color: 'var(--blue)' });
        photo.push({ time: r.timeMs, values: valueAt(r.photocurrentNa, r, selected), color: 'var(--blue)' });
      }
    }
    drawTrace(containers.photo, 'Compartment photocurrent · nA · inward < 0', photo, duration);
    let voltageMin = -100, voltageMax = 40;
    for (const s of volt) for (const v of s.values) { voltageMin = Math.min(voltageMin, Math.floor(v / 10) * 10); voltageMax = Math.max(voltageMax, Math.ceil(v / 10) * 10); }
    drawTrace(containers.voltage, 'Membrane voltage · mV', volt, duration, [voltageMin, voltageMax]);
    const raster = base(containers.spikes, state.config?.mode === 'clamp' ? 'Ideal patch · no spike detector' : 'Somatic events · upward −25 mV crossing', 77, duration, [0, 1]);
    // Raster has a single event row; numeric vertical ticks are not useful here.
    for (const label of raster.svg.querySelectorAll('text')) if (Number(label.getAttribute('x')) < raster.left) label.remove();
    if (b && b.config.mode === 'neuron') for (const spike of b.spikes) raster.svg.append(el('line', { x1: raster.x(spike.timeMs), x2: raster.x(spike.timeMs), y1: 31, y2: 44, stroke: 'var(--brass)', 'stroke-width': 2, 'stroke-dasharray': '2 2' }));
    if (r?.config.mode === 'neuron') for (const spike of r.spikes) raster.svg.append(el('line', { x1: raster.x(spike.timeMs), x2: raster.x(spike.timeMs), y1: 28, y2: 46, stroke: 'var(--ink)', 'stroke-width': 2 }));
    raster.svg.append(raster.cursor);
  }
  const observer = new ResizeObserver(() => render());
  observer.observe(containers.voltage);
  return {
    setData(next) { state = { ...state, ...next }; render(); },
    setCursor(timeMs) { cursorMs = timeMs; for (const { cursor, x } of layouts.values()) { cursor.setAttribute('x1', x(timeMs)); cursor.setAttribute('x2', x(timeMs)); } },
    destroy() { observer.disconnect(); },
  };
}




export { createRecordingPlots };
