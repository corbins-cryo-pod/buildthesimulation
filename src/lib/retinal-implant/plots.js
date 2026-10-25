// Presentation only: these routines consume calculated arrays without changing them.
export const fmt = (n, digits = 1) => Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
export const peak = a => { let p = 0; if (a) for (const v of a) if (Number.isFinite(v)) p = Math.max(p, Math.abs(v)); return p; };

function setup(canvas, background = '#111412') {
  const rect = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(100, rect.width), height = Math.max(80, rect.height);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
  ctx.font = '10px "RI Gothic", Arial, sans-serif'; ctx.lineWidth = 1;
  return { ctx, width, height };
}

function empty(ctx, width, height, title = 'Run an experiment') {
  ctx.fillStyle = '#8e948a'; ctx.textAlign = 'center'; ctx.fillText(title, width / 2, height / 2);
}

function axes(ctx, box, xMin, xMax, yMin, yMax, xLabel, yLabel, decimals = 0) {
  ctx.strokeStyle = '#4c5149'; ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = '#b5bdaf'; ctx.font = '9px "RI Gothic", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  [0, .5, 1].forEach(t => { ctx.fillText(fmt(xMin + (xMax - xMin) * t, decimals), box.x + box.w * t, box.y + box.h + 7); });
  ctx.fillText(xLabel, box.x + box.w / 2, box.y + box.h + 23);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [0, .5, 1].forEach(t => { ctx.fillText(fmt(yMax - (yMax - yMin) * t, decimals), box.x - 7, box.y + box.h * t); });
  ctx.save(); ctx.translate(12, box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(yLabel, 0, 0); ctx.restore();
}

export function drawRaster(canvas, data, { maximum, signed = false, physical = false, title, contacts = [], selectedId } = {}) {
  const { ctx, width, height } = setup(canvas);
  if (!data) { empty(ctx, width, height, title); return; }
  const values = data.values ?? data.brightness;
  if (!values || !data.width || !data.height) { empty(ctx, width, height, title); return; }
  const x = physical ? data.xUm : data.xDeg, y = physical ? data.yUm : data.yDeg;
  const max = Math.max(maximum ?? peak(values), Number.MIN_VALUE);
  const scale = physical ? 1000 : 1;
  const box = { x: 43, y: 14, w: width - 58, h: height - 58 };
  const xSpan = x[x.length - 1] - x[0], ySpan = y[0] - y[y.length - 1];
  const side = Math.min(box.w, box.h); box.x += (box.w - side) / 2; box.y += (box.h - side) / 2; box.w = side; box.h = side;
  const image = document.createElement('canvas'); image.width = data.width; image.height = data.height;
  const off = image.getContext('2d'), pixels = off.createImageData(data.width, data.height);
  for (let i = 0; i < values.length; i++) {
    const v = Math.max(-1, Math.min(1, values[i] / max)); let color;
    if (signed) {
      const k = Math.abs(v), low = v < 0 ? [72, 131, 153] : [195, 151, 78], middle = [233, 229, 211];
      color = middle.map((m, j) => m + (low[j] - m) * k);
    } else { const g = Math.max(0, v) * 255; color = [g, g, g]; }
    pixels.data.set([color[0], color[1], color[2], 255], i * 4);
  }
  off.putImageData(pixels, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(image, box.x, box.y, box.w, box.h);
  if (physical) {
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    for (const contact of contacts) {
      const px = box.x + (contact.xUm - x[0]) / xSpan * box.w, py = box.y + (y[0] - contact.yUm) / ySpan * box.h;
      ctx.beginPath(); ctx.arc(px, py, Math.max(1.7, contact.radiusUm / xSpan * box.w), 0, Math.PI * 2);
      ctx.strokeStyle = contact.id === selectedId ? '#fff7d8' : '#46504c'; ctx.lineWidth = contact.id === selectedId ? 2 : .65; ctx.stroke();
    } ctx.restore();
  }
  axes(ctx, box, x[0] / scale, x[x.length - 1] / scale, y[y.length - 1] / scale, y[0] / scale, physical ? 'Retinal x (mm)' : 'Visual x (°)', physical ? 'Retinal y (mm)' : 'Visual y (°)', physical ? 1 : 0);
}

function bundles(data) {
  return (data?.bundles ?? data?.paths ?? []).map(b => Array.isArray(b) ? b : b.points ?? b.xyUm ?? []);
}

export function drawRetinalPlan(canvas, contacts, config, selectedId, axonData, showFibers = true) {
  const { ctx, width, height } = setup(canvas, '#252924');
  const boundX = Math.max(7300, ...contacts.map(p => Math.abs(p.xUm) + 700));
  const boundY = Math.max(5600, ...contacts.map(p => Math.abs(p.yUm) + 700));
  const box = { x: 42, y: 18, w: width - 59, h: height - 60 };
  const scale = Math.min(box.w / (boundX * 2), box.h / (boundY * 2));
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  box.w = boundX * 2 * scale; box.h = boundY * 2 * scale; box.x = cx - box.w / 2; box.y = cy - box.h / 2;
  const project = (x, y) => [cx + x * scale, cy - y * scale];
  const retinal = project(0, 0);
  const glow = ctx.createRadialGradient(...retinal, 10, ...retinal, 7000 * scale);
  glow.addColorStop(0, '#5a5642'); glow.addColorStop(1, '#343c32');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(...retinal, 7000 * scale, 5400 * scale, 0, 0, 2 * Math.PI); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
  ctx.strokeStyle = '#9d9d7c'; ctx.globalAlpha = .12; ctx.lineWidth = .5;
  for (let i = -6000; i <= 6000; i += 2000) { const a = project(i, -boundY), b = project(i, boundY), c = project(-boundX, i), d = project(boundX, i); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.moveTo(...c); ctx.lineTo(...d); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (showFibers && axonData) {
    const mirror = (axonData.eye ?? 'RE') !== config.eye ? -1 : 1;
    ctx.strokeStyle = '#d9bf81'; ctx.globalAlpha = .32; ctx.lineWidth = .65;
    for (const path of bundles(axonData)) { ctx.beginPath(); path.forEach((p, i) => { const q = project((p[0] ?? p.xUm) * mirror, p[1] ?? p.yUm); i ? ctx.lineTo(...q) : ctx.moveTo(...q); }); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  const disc = axonData?.opticDiscUm ?? [4200, -300];
  const discPoint = project(disc[0] * (config.eye === 'LE' ? -1 : 1), disc[1]);
  ctx.fillStyle = '#bfb18a'; ctx.beginPath(); ctx.ellipse(...discPoint, 330 * scale, 460 * scale, 0, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = '#c7c4a2'; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(...retinal, Math.max(3, 130 * scale), 0, 2 * Math.PI); ctx.stroke();
  ctx.font = '10px "RI Gothic", Arial, sans-serif'; ctx.fillStyle = '#d8cfad'; ctx.textAlign = 'center'; ctx.fillText('Fovea', retinal[0], retinal[1] + 18); ctx.fillText('Optic disc', discPoint[0], discPoint[1] + 460 * scale + 13);
  const maxCurrent = Math.max(1, ...contacts.map(p => p.amplitudeUa));
  const locations = [];
  for (const p of contacts) {
    const [x, y] = project(p.xUm, p.yUm), r = Math.max(2.4, p.radiusUm * scale); locations.push({ id: p.id, x, y, r });
    ctx.fillStyle = !p.enabled ? '#363b35' : p.amplitudeUa > 0 ? `rgb(${135 + 88 * p.amplitudeUa / maxCurrent},${121 + 66 * p.amplitudeUa / maxCurrent},${76 + 33 * p.amplitudeUa / maxCurrent})` : '#555e53';
    ctx.strokeStyle = p.id === selectedId ? '#fff6d0' : '#9c9d83'; ctx.lineWidth = p.id === selectedId ? 2 : .6; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (!p.enabled) { ctx.strokeStyle = '#b78a75'; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); }
  }
  ctx.restore();
  axes(ctx, box, -boundX / 1000, boundX / 1000, -boundY / 1000, boundY / 1000, 'Retinal x (mm)', 'Retinal y (mm)', 1);
  return locations;
}

export function drawRetinalSection(canvas, contacts, config, selectedId) {
  const { ctx, width, height } = setup(canvas, '#252924');
  const xExtent = Math.max(3500, ...contacts.map(c => Math.abs(c.xUm) + 600));
  const zMax = Math.max(650, config.gapUm * 2.2), zMin = -250;
  const box = { x: 45, y: 24, w: width - 64, h: height - 72 };
  const X = x => box.x + (x + xExtent) / (2 * xExtent) * box.w, Z = z => box.y + (zMax - z) / (zMax - zMin) * box.h;
  ctx.fillStyle = '#4a5749'; ctx.fillRect(box.x, Z(0), box.w, Z(zMin) - Z(0));
  ctx.strokeStyle = '#a2b198'; ctx.beginPath(); ctx.moveTo(box.x, Z(0)); ctx.lineTo(box.x + box.w, Z(0)); ctx.stroke();
  ctx.fillStyle = '#d5d7bf'; ctx.textAlign = 'left'; ctx.font = '10px "RI Gothic", Arial, sans-serif'; ctx.fillText('Retinal tangent plane · z = 0', box.x + 9, Z(0) + 18);
  for (const c of contacts) {
    const w = Math.max(3, c.radiusUm * 2 / (2 * xExtent) * box.w), x = X(c.xUm), y = Z(c.zUm);
    ctx.fillStyle = c.id === selectedId ? '#f3d898' : c.amplitudeUa > 0 ? '#baa16b' : '#677066'; ctx.fillRect(x - w / 2, y - 3, w, 6);
  }
  const chosen = contacts.find(p => p.id === selectedId);
  if (chosen) {
    const x = X(chosen.xUm) + 13; ctx.setLineDash([3, 3]); ctx.strokeStyle = '#d6c89a'; ctx.beginPath(); ctx.moveTo(x, Z(chosen.zUm)); ctx.lineTo(x, Z(0)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#eee5c6'; ctx.textAlign = x > width * .7 ? 'right' : 'left'; ctx.fillText(`${fmt(config.gapUm, 0)} µm gap`, x + (x > width * .7 ? -7 : 7), (Z(chosen.zUm) + Z(0)) / 2);
  }
  axes(ctx, box, -xExtent / 1000, xExtent / 1000, zMin / 1000, zMax / 1000, 'Retinal x (mm) · projected contacts', 'z (mm)', 1);
}

export function drawWaveform(canvas, waveform, fullTrain = false) {
  const dark = document.documentElement.dataset.theme === 'dark';
  const background = dark ? '#292a24' : '#f8f4e9', ink = dark ? '#e3dac8' : '#403e32', rule = dark ? '#5a574b' : '#d0c7b4';
  const { ctx, width, height } = setup(canvas, background);
  if (!waveform) { empty(ctx, width, height, 'Run to calculate the delivered pulse train'); return; }
  const events = waveform.events ?? [];
  const t0 = fullTrain ? 0 : Math.max(0, (events[0]?.startMs ?? waveform.offsetMs ?? 0) - .15);
  const t1 = fullTrain ? waveform.trainDurationMs : t0 + Math.max(1.5, 3 * (2 * waveform.phaseDurationMs + waveform.interphaseMs));
  const amp = Math.max(1, waveform.amplitudeUa), box = { x: 51, y: 16, w: width - 68, h: height - 55 };
  const X = t => box.x + (t - t0) / Math.max(.001, t1 - t0) * box.w, Y = i => box.y + box.h / 2 - i / amp * box.h * .40;
  ctx.strokeStyle = rule; ctx.lineWidth = 1;
  for (const t of [0, .5, 1]) { const y = box.y + t * box.h; ctx.beginPath(); ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.w, y); ctx.stroke(); }
  ctx.strokeStyle = dark ? '#d5ba7c' : '#876735'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(t0), Y(0));
  for (const event of events) {
    if (event.endMs < t0 || event.startMs > t1) continue;
    const begin = Math.max(t0, event.startMs), end = Math.min(t1, event.endMs);
    ctx.lineTo(X(begin), Y(0)); ctx.lineTo(X(begin), Y(event.currentUa)); ctx.lineTo(X(end), Y(event.currentUa)); ctx.lineTo(X(end), Y(0));
  }
  ctx.lineTo(X(t1), Y(0)); ctx.stroke();
  ctx.fillStyle = ink; ctx.font = '10px "RI Gothic", Arial, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const value of [-amp, 0, amp]) ctx.fillText(fmt(value, 0), box.x - 7, Y(value));
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const t of [0, .25, .5, .75, 1]) ctx.fillText(fmt(t0 + t * (t1 - t0), fullTrain ? 0 : 2), box.x + t * box.w, box.y + box.h + 8);
  ctx.fillText('Time (ms)', box.x + box.w / 2, height - 14);
  ctx.save(); ctx.translate(13, box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Current (µA)', 0, 0); ctx.restore();
}
