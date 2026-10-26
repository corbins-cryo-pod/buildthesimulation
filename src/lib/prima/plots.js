// Display routines only. Calculated samples are never renormalized or mutated.
export const formatNumber = (value, digits = 1) => Number.isFinite(value)
  ? value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
export const absolutePeak = values => { let result = 0; for (const v of values ?? []) if (Number.isFinite(v)) result = Math.max(result, Math.abs(v)); return result; };

function surface(canvas, paper = false) {
  const dark = document.documentElement.dataset.theme === 'dark';
  const rect = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(80, rect.width), height = Math.max(60, rect.height);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d'); context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const palette = paper
    ? { background: dark ? '#292923' : '#faf7ed', ink: dark ? '#e7dfcc' : '#36372d', muted: dark ? '#b6ad98' : '#77705f', rule: dark ? '#514f40' : '#d6cebb', brass: dark ? '#d6b678' : '#88682f', teal: dark ? '#9cbdb3' : '#497c74' }
    : { background: '#202521', ink: '#f0e8d3', muted: '#a6b0a5', rule: '#424b42', brass: '#dfc185', teal: '#8db9ac' };
  context.fillStyle = palette.background; context.fillRect(0, 0, width, height);
  context.font = '10px "PR Gothic", Arial, sans-serif'; context.lineWidth = 1;
  return { context, width, height, palette };
}

function message(context, width, height, palette, text = 'Run the experiment to calculate this view') {
  context.fillStyle = palette.muted; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2);
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

export function hexVertices(pixel, scale = 1) {
  const supplied = pixel?.verticesUm ?? pixel?.vertices ?? pixel?.polygon;
  if (supplied?.length === 6) return supplied.map(p => [Number(p.xUm ?? p.x ?? p[0]) * scale, Number(p.yUm ?? p.y ?? p[1]) * scale]);
  const radius = pixel?.hexRadiusUm ?? pixel?.outerRadiusUm ?? (pixel?.pitchUm ?? 100) / Math.sqrt(3);
  return Array.from({ length: 6 }, (_, k) => {
    const angle = Math.PI / 6 + k * Math.PI / 3;
    return [(pixel.xUm + radius * Math.cos(angle)) * scale, (pixel.yUm + radius * Math.sin(angle)) * scale];
  });
}

function imageBox(width, height, axes = false) {
  const side = Math.max(1, Math.min(width - (axes ? 67 : 26), height - (axes ? 56 : 24)));
  return { x: (width - side) / 2 + (axes ? 8 : 0), y: axes ? 12 : (height - side) / 2, w: side, h: side };
}

function paintSamples(ctx, data, box, color) {
  const n = data?.width ?? data?.size, m = data?.height ?? data?.size;
  const values = data?.values ?? data?.brightness;
  if (!n || !m || !values || values.length < n * m) return false;
  const image = document.createElement('canvas'); image.width = n; image.height = m;
  const scratch = image.getContext('2d'), frame = scratch.createImageData(n, m);
  for (let i = 0; i < n * m; i++) { const rgb = color(Number(values[i])); const p = i * 4; frame.data[p] = rgb[0]; frame.data[p + 1] = rgb[1]; frame.data[p + 2] = rgb[2]; frame.data[p + 3] = 255; }
  scratch.putImageData(frame, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(image, box.x, box.y, box.w, box.h); return true;
}

export function drawPrimaImage(canvas, data, { fieldDeg = 6.944, title = 'Calculate a visual approximation', pixelOverlay = false, pixels = [], selectedId } = {}) {
  const { context: ctx, width, height, palette } = surface(canvas);
  if (!data) { message(ctx, width, height, palette, title); return; }
  const box = imageBox(width, height, true);
  if (!paintSamples(ctx, data, box, v => { const gray = Math.round(255 * Math.max(0, Math.min(1, v))); return [gray, gray, gray]; })) { message(ctx, width, height, palette, title); return; }
  ctx.strokeStyle = '#737b6f'; ctx.strokeRect(box.x, box.y, box.w, box.h);
  if (pixelOverlay) {
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    for (const p of pixels) {
      ctx.beginPath(); hexVertices(p).forEach(([x, y], i) => { const xx = box.x + (x + 1000) / 2000 * box.w, yy = box.y + (1000 - y) / 2000 * box.h; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }); ctx.closePath();
      ctx.strokeStyle = p.id === selectedId ? '#f5d48d' : '#bda66f'; ctx.globalAlpha = p.id === selectedId ? 1 : .3; ctx.lineWidth = p.id === selectedId ? 1.8 : .5; ctx.stroke();
    } ctx.restore();
  }
  ctx.fillStyle = palette.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(`−${formatNumber(fieldDeg / 2, 1)}°`, box.x, box.y + box.h + 7);
  ctx.fillText('0°', box.x + box.w / 2, box.y + box.h + 7);
  ctx.fillText(`+${formatNumber(fieldDeg / 2, 1)}°`, box.x + box.w, box.y + box.h + 7);
  ctx.fillText('Retinal image extent', box.x + box.w / 2, box.y + box.h + 22);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(`+${formatNumber(fieldDeg / 2, 1)}°`, box.x - 6, box.y + 4); ctx.fillText(`−${formatNumber(fieldDeg / 2, 1)}°`, box.x - 6, box.y + box.h - 4);
}

export function drawPrimaPlan(canvas, pixels = [], config = {}, selectedId, pixelMetrics = []) {
  const { context: ctx, width, height, palette } = surface(canvas);
  const side = Math.min(width - 64, height - 70), s = side / 2240, cx = width / 2, cy = (height - 20) / 2;
  const X = x => cx + x * s, Y = y => cy - y * s;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, side * .7); glow.addColorStop(0, '#535747'); glow.addColorStop(1, '#202521'); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#4e574a'; ctx.lineWidth = .5;
  for (const p of [-1000, -500, 0, 500, 1000]) { ctx.beginPath(); ctx.moveTo(X(p), Y(1100)); ctx.lineTo(X(p), Y(-1100)); ctx.moveTo(X(-1100), Y(p)); ctx.lineTo(X(1100), Y(p)); ctx.stroke(); }
  roundedRect(ctx, X(-1000), Y(1000), 2000 * s, 2000 * s, 120 * s); ctx.fillStyle = '#35464a'; ctx.fill(); ctx.strokeStyle = '#a5aa94'; ctx.lineWidth = 1; ctx.stroke();
  const byId = Array.isArray(pixelMetrics) ? new Map(pixelMetrics.map(p => [p.id ?? p.pixelId, p])) : new Map(Object.entries(pixelMetrics ?? {}));
  const locations = [];
  for (const p of pixels) {
    const metric = byId.get(p.id), illumination = metric?.illumination ?? metric?.intensity ?? metric?.opticalFraction ?? p.illumination ?? p.intensity ?? 0;
    const level = Math.max(0, Math.min(1, illumination));
    ctx.beginPath(); hexVertices(p).forEach(([x, y], i) => { if (i) ctx.lineTo(X(x), Y(y)); else ctx.moveTo(X(x), Y(y)); }); ctx.closePath();
    ctx.fillStyle = `rgb(${42 + level * 61},${63 + level * 55},${66 + level * 34})`; ctx.fill(); ctx.strokeStyle = p.id === selectedId ? '#fff1bd' : '#afa476'; ctx.lineWidth = p.id === selectedId ? 1.8 : .55; ctx.stroke();
    const r = Math.max(1, (p.activeRadiusUm ?? p.radiusUm ?? 14) * s); ctx.beginPath(); ctx.arc(X(p.xUm), Y(p.yUm), r, 0, Math.PI * 2); ctx.fillStyle = p.id === selectedId ? '#fff1bd' : level > 0 ? '#d0b676' : '#8d865e'; ctx.fill();
    locations.push({ id: p.id, x: X(p.xUm), y: Y(p.yUm), r: Math.max(5, 40 * s) });
  }
  if (!pixels.length) { ctx.fillStyle = '#d0d4ba'; ctx.textAlign = 'center'; ctx.fillText('Preparing the reconstructed pixel geometry…', cx, cy); }
  ctx.fillStyle = palette.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const p of [-1000, 0, 1000]) ctx.fillText(formatNumber(p / 1000, 1), X(p), Y(-1100) + 5);
  ctx.fillText('Retinal x (mm)', cx, height - 17);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; for (const p of [-1000, 0, 1000]) ctx.fillText(formatNumber(p / 1000, 1), X(-1100) - 5, Y(p));
  ctx.save(); ctx.translate(12, cy); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('Retinal y (mm)', 0, 0); ctx.restore();
  return locations;
}

export function drawPrimaSection(canvas, config = {}, selectedPixel) {
  const { context: ctx, width, height, palette } = surface(canvas);
  const gap = Number(config.debrisUm ?? config.gapUm ?? config.debrisThicknessUm ?? 40);
  const box = { x: 42, y: 24, w: width - 62, h: height - 76 }, zMin = -45, zMax = Math.max(170, gap + 130);
  const X = x => box.x + (x + 1200) / 2400 * box.w, Z = z => box.y + (zMax - z) / (zMax - zMin) * box.h;
  const layer = (low, high, color, caption) => { ctx.fillStyle = color; ctx.fillRect(box.x, Z(high), box.w, Z(low) - Z(high)); ctx.fillStyle = '#d8dece'; ctx.textAlign = 'left'; ctx.fillText(caption, box.x + 8, Z(high) + 15); };
  layer(-45, -30, '#484438', 'Underlying tissue');
  layer(0, gap, '#363c32', 'Electrode–neuron separation');
  layer(gap, gap + 65, '#405649', 'Bipolar-cell region');
  layer(gap + 65, zMax, '#3a4844', 'Inner retinal circuitry');
  ctx.fillStyle = '#587078'; ctx.fillRect(X(-1000), Z(0), X(1000) - X(-1000), Z(-30) - Z(0));
  ctx.strokeStyle = '#b5b895'; ctx.strokeRect(X(-1000), Z(0), X(1000) - X(-1000), Z(-30) - Z(0));
  ctx.fillStyle = '#ebd79f'; ctx.textAlign = 'center'; ctx.fillText('Silicon implant · 30 μm', width / 2, Z(-15) + 4);
  const targetX = selectedPixel?.xUm ?? 0;
  for (let x = -950; x <= 950; x += 100) { ctx.fillStyle = Math.abs(x - targetX) < 65 ? '#f3dc9f' : '#c2ac78'; ctx.fillRect(X(x - 14), Z(0) - 2, Math.max(2, 28 / 2400 * box.w), 4); }
  for (let k = 0; k < 12; k++) {
    const x = -870 + k * 158, center = gap + 29 + 7 * Math.sin(k * 1.9), xx = X(x);
    ctx.strokeStyle = '#95b7a1'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xx, Z(gap + 3)); ctx.lineTo(xx, Z(gap + 64)); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(xx, Z(center), 3.7, 6, 0, 0, Math.PI * 2); ctx.fillStyle = '#91b49e'; ctx.fill();
    for (const dx of [-33, 33]) { ctx.beginPath(); ctx.moveTo(xx, Z(gap + 12)); ctx.lineTo(X(x + dx), Z(gap + 4)); ctx.moveTo(xx, Z(gap + 54)); ctx.lineTo(X(x + dx), Z(gap + 65)); ctx.stroke(); }
  }
  const dx = X(1070); ctx.strokeStyle = '#e4c683'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(dx, Z(0)); ctx.lineTo(dx, Z(gap)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#f0d9a7'; ctx.textAlign = 'right'; ctx.fillText(`${formatNumber(gap, 0)} μm`, dx - 6, (Z(gap) + Z(0)) / 2 + 4);
  ctx.strokeStyle = palette.rule; ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = palette.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const x of [-1000, 0, 1000]) ctx.fillText(formatNumber(x / 1000, 1), X(x), box.y + box.h + 7);
  ctx.fillText('Retinal x (mm) · cell drawings are schematic', width / 2, height - 16);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; for (const z of [0, 50, 100, 150]) if (z <= zMax) ctx.fillText(String(z), box.x - 5, Z(z));
  ctx.save(); ctx.translate(12, box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('Depth above implant (μm)', 0, 0); ctx.restore();
}

export function drawPrimaField(canvas, data, { mode = 'bc', selectedId, pixels = [] } = {}) {
  const { context: ctx, width, height, palette } = surface(canvas);
  const values = mode === 'potential' ? data?.potentialMv ?? data?.potential : data?.bcDeltaMv ?? data?.deltaPhiMv ?? data?.values;
  if (!data || !values) { message(ctx, width, height, palette, 'Run to calculate the electrical field'); return; }
  const n = data.width ?? data.size ?? Math.sqrt(values.length), h = data.height ?? n;
  const box = imageBox(width, height, true), maximum = Math.max(absolutePeak(values), Number.MIN_VALUE);
  paintSamples(ctx, { width: n, height: h, values }, box, v => {
    const q = Math.max(-1, Math.min(1, v / maximum)), a = Math.abs(q), zero = [33, 40, 35], high = q < 0 ? [107, 171, 179] : [239, 199, 111];
    return zero.map((c, i) => c + (high[i] - c) * a);
  });
  const xValues = data.xUm ?? [], yValues = data.yUm ?? [], xMin = data.xMinUm ?? xValues[0] ?? -1000, xMax = data.xMaxUm ?? xValues[xValues.length - 1] ?? 1000;
  const yMax = data.yMaxUm ?? Math.max(...(yValues.length ? yValues : [1000])), yMin = data.yMinUm ?? Math.min(...(yValues.length ? yValues : [-1000]));
  const chosen = pixels.find(p => p.id === selectedId);
  if (chosen) { const x = box.x + (chosen.xUm - xMin) / (xMax - xMin) * box.w, y = box.y + (yMax - chosen.yUm) / (yMax - yMin) * box.h; ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = palette.rule; ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = palette.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(formatNumber(xMin / 1000, 1), box.x, box.y + box.h + 7); ctx.fillText('0', box.x + box.w / 2, box.y + box.h + 7); ctx.fillText(formatNumber(xMax / 1000, 1), box.x + box.w, box.y + box.h + 7);
  ctx.fillText('Retinal x (mm)', box.x + box.w / 2, box.y + box.h + 22);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(formatNumber(yMax / 1000, 1), box.x - 6, box.y + 3); ctx.fillText(formatNumber(yMin / 1000, 1), box.x - 6, box.y + box.h - 3);
  ctx.textAlign = 'left'; ctx.fillStyle = '#e8c88e'; ctx.fillText(`±${formatNumber(maximum, maximum < 1 ? 3 : 1)} mV`, box.x + 5, box.y + 12);
}

function waveformTraces(waveform, selectedId) {
  if (!waveform) return null;
  const pixels = waveform.pixels ?? waveform.byPixel ?? {}, selected = pixels[selectedId] ?? waveform;
  const time = waveform.timeMs ?? waveform.tMs ?? waveform.timesMs ?? selected.timeMs;
  if (!time?.length) return null;
  return { time, optical: selected.irradianceMwMm2 ?? waveform.irradianceMwMm2 ?? waveform.opticalMwMm2 ?? waveform.lightMwMm2, current: selected.currentUa ?? selected.currentMicroA ?? waveform.currentUa, voltage: selected.electrodeMv ?? selected.polarizationMv };
}

export function drawPrimaWaveform(canvas, waveform, { selectedId, showVoltage = false } = {}) {
  const { context: ctx, width, height, palette } = surface(canvas, true), traces = waveformTraces(waveform, selectedId);
  if (!traces) { message(ctx, width, height, palette); return; }
  const time = traces.time, xmin = time[0], xmax = time[time.length - 1], plot = { x: 52, w: width - 70 }, X = t => plot.x + (t - xmin) / Math.max(xmax - xmin, .001) * plot.w;
  function panel(values, y, h, color, title, unit, zeroBottom = false) {
    let maximum = 0, minimum = 0;
    for (const value of values ?? []) if (Number.isFinite(value)) { maximum = Math.max(maximum, value); minimum = Math.min(minimum, value); }
    const span = Math.max(maximum - minimum, 1e-12), top = Math.max(maximum + .12 * span, 1e-12), min = zeroBottom ? 0 : minimum - .08 * span;
    const Y = v => y + (top - v) / (top - min) * h;
    ctx.strokeStyle = palette.rule; ctx.lineWidth = .7;
    for (const f of [0, .5, 1]) { const yy = y + h * f; ctx.beginPath(); ctx.moveTo(plot.x, yy); ctx.lineTo(plot.x + plot.w, yy); ctx.stroke(); }
    if (values?.length) { ctx.strokeStyle = color; ctx.lineWidth = 1.55; ctx.beginPath(); for (let i = 0; i < Math.min(time.length, values.length); i++) { const x = X(time[i]), yy = Y(values[i]); if (i) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); } ctx.stroke(); }
    ctx.fillStyle = palette.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(formatNumber(maximum, maximum < .1 ? 3 : 1), plot.x - 6, Y(maximum));
    if (maximum > span * .15) ctx.fillText('0', plot.x - 6, Y(0));
    if (minimum < -span * .12) ctx.fillText(formatNumber(minimum, Math.abs(minimum) < .1 ? 3 : 1), plot.x - 6, Y(minimum));
    ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(`${title} (${unit})`, plot.x, y - 4);
  }
  const top = 25, bottom = 37, gap = 31, available = height - top - bottom - gap;
  panel(traces.optical, top, available * .35, palette.teal, 'Projected light', 'mW/mm²', true);
  panel(showVoltage ? traces.voltage : traces.current, top + available * .35 + gap, available * .65, palette.brass, showVoltage ? 'Interface polarization' : 'Selected-pixel current', showVoltage ? 'mV' : 'μA');
  ctx.fillStyle = palette.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const f of [0, .25, .5, .75, 1]) ctx.fillText(formatNumber(xmin + (xmax - xmin) * f, xmax > 100 ? 0 : 1), plot.x + plot.w * f, height - 30);
  ctx.fillText('Time (ms)', plot.x + plot.w / 2, height - 14);
}

export function drawPrimaFrequency(canvas, response, config = {}) {
  const { context: ctx, width, height, palette } = surface(canvas, true);
  const points = Array.isArray(response) ? response : response?.points;
  const frequencies = response?.cyclesPerImage ?? response?.frequency ?? response?.frequencies;
  const gains = response?.gain ?? response?.gains;
  const list = points?.map(p => [p.cyclesPerImage ?? p.frequency ?? p[0], p.gain ?? p[1]]) ?? frequencies?.map((x, i) => [x, gains?.[i]]) ?? [];
  if (!list.length) { message(ctx, width, height, palette, 'Filter response appears after calculation'); return; }
  const box = { x: 41, y: 17, w: width - 57, h: height - 52 }, maxX = Math.max(...list.map(p => p[0])), X = x => box.x + x / maxX * box.w, Y = y => box.y + (1 - y) * box.h;
  ctx.strokeStyle = palette.rule; ctx.lineWidth = .7;
  for (const f of [0, .5, 1]) { ctx.beginPath(); ctx.moveTo(box.x, Y(f)); ctx.lineTo(box.x + box.w, Y(f)); ctx.stroke(); }
  ctx.strokeStyle = palette.brass; ctx.lineWidth = 1.8; ctx.beginPath(); list.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke();
  ctx.fillStyle = palette.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('1', box.x - 6, Y(1)); ctx.fillText('0', box.x - 6, Y(0));
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (const f of [0, .5, 1]) ctx.fillText(formatNumber(maxX * f, 0), box.x + box.w * f, box.y + box.h + 7);
  ctx.fillText('Spatial frequency (cycles / implant width)', box.x + box.w / 2, height - 12);
}
