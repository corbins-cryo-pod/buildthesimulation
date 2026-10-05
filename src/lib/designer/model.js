export const MAX_CONTACTS = 4096;
export const SHAPES = ['circle', 'square', 'rectangle', 'ellipse', 'ring'];
export const SIDES = ['left', 'right', 'top', 'bottom'];
export const LAYER_COLORS = ['#e9b867', '#55cecb', '#ae9bf1', '#ea869d'];
export const DEFAULT_PATTERN = { layout: 'grid', rows: 8, cols: 8, count: 32, rings: 3, pitchX: 150, pitchY: 150, radius: 600, ringPitch: 180, rotation: 0, x: 0, y: 0, shape: 'circle', w: 40, h: 40, inner: 20, contactRotation: 0 };
export const DEFAULT_ROUTING = { arrangement: 'split-lr', style: 'rounded', width: 5, gap: 5, layers: 4, bankDistance: 900, padPitch: 70, padWidth: 45, padHeight: 80, padOffset: 0, order: 'geometric', radius: 25, amplitude: 20, wavelength: 180, sheetResistance: 0.2, minWidth: 3, minGap: 3, substrateMargin: 70, substrateRadius: 100, substrateStyle: 'envelope', insulationMargin: 12, substrateThickness: 6, material: 'Au', dielectric: 'Polyimide' };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
export const snap = (v, step) => step > 0 ? Math.round(v / step) * step : v;
export function normalizedContact(c, i = 0) {
  const w = clamp(finite(c.w, 40), 1, 10000), h = clamp(finite(c.h, w), 1, 10000);
  return { id: String(c.id ?? `E${i + 1}`).slice(0, 60), x: clamp(finite(c.x, 0), -1e6, 1e6), y: clamp(finite(c.y, 0), -1e6, 1e6), shape: SHAPES.includes(c.shape) ? c.shape : 'circle', w, h,
    inner: clamp(finite(c.inner, w / 2), 0, w - 0.5), rotation: finite(c.rotation, 0) % 360,
    row: Math.floor(finite(c.row, i)), col: Math.floor(finite(c.col, 0)), group: String(c.group ?? 'custom').slice(0, 60),
    exit: SIDES.includes(c.exit) ? c.exit : 'auto', layer: clamp(Math.floor(finite(c.layer, 0)), 0, 4) };
}
export function normalizeRouting(r = {}) {
  const out = { ...DEFAULT_ROUTING, ...r };
  for (const [key, low, high] of [['width', .5, 500], ['gap', .5, 500], ['layers', 1, 4], ['bankDistance', 100, 20000], ['padPitch', 5, 2000], ['padWidth', 2, 1000], ['padHeight', 2, 1000], ['padOffset', -20000, 20000], ['radius', 0, 1000], ['amplitude', 0, 500], ['wavelength', 20, 2000], ['sheetResistance', 0, 1000], ['minWidth', .5, 500], ['minGap', .5, 500], ['substrateMargin', 0, 2000], ['substrateRadius', 0, 2000], ['insulationMargin', 0, 1000], ['substrateThickness', .1, 1000]]) out[key] = clamp(finite(out[key], DEFAULT_ROUTING[key]), low, high);
  out.layers = Math.floor(out.layers);
  if (!['left', 'right', 'top', 'bottom', 'split-lr', 'split-tb', 'interleave-lr', 'rows-lr', 'cols-tb', 'four-sides'].includes(out.arrangement)) out.arrangement = 'split-lr';
  if (!['straight', 'manhattan', 'rounded', 'serpentine'].includes(out.style)) out.style = 'rounded';
  if (!['geometric', 'id', 'reverse', 'column', 'snake'].includes(out.order)) out.order = 'geometric';
  out.material = ['Au', 'Pt', 'Custom'].includes(out.material) ? out.material : 'Au';
  out.dielectric = ['Polyimide', 'Parylene-C', 'SU-8', 'Custom'].includes(out.dielectric) ? out.dielectric : 'Polyimide';
  out.substrateStyle = out.substrateStyle === 'ribbons' ? 'ribbons' : 'envelope';
  return out;
}
export function generatePattern(options, firstId = 1) {
  const p = { ...DEFAULT_PATTERN, ...options }, contacts = [];
  const rows = clamp(Math.floor(finite(p.rows, 1)), 1, 256), cols = clamp(Math.floor(finite(p.cols, 1)), 1, 256);
  const count = clamp(Math.floor(finite(p.count, 1)), 1, MAX_CONTACTS), rings = clamp(Math.floor(finite(p.rings, 1)), 1, 64);
  const px = clamp(finite(p.pitchX, 150), 1, 10000), py = clamp(finite(p.pitchY, 150), 1, 10000), rad = clamp(finite(p.radius, 600), 1, 100000);
  const angle = finite(p.rotation, 0) * Math.PI / 180;
  const add = (x, y, row, col) => {
    if (contacts.length >= MAX_CONTACTS) return;
    const c = normalizedContact({ id: `E${firstId + contacts.length}`, x: x * Math.cos(angle) - y * Math.sin(angle) + finite(p.x, 0), y: x * Math.sin(angle) + y * Math.cos(angle) + finite(p.y, 0), shape: p.shape, w: p.w, h: p.h, inner: p.inner, rotation: p.contactRotation, row, col, group: `pattern-${firstId}` });
    contacts.push(c);
  };
  if (p.layout === 'line') { for (let i = 0; i < count; i++) add((i - (count - 1) / 2) * px, 0, 0, i); }
  else if (p.layout === 'circle' || p.layout === 'concentric' || p.layout === 'arc') {
    for (let r = 0; r < (p.layout === 'concentric' ? rings : 1); r++) for (let i = 0; i < count; i++) {
      const theta = p.layout === 'arc' ? -Math.PI / 2 + Math.PI * i / Math.max(1, count - 1) : 2 * Math.PI * i / count;
      const rr = rad + r * clamp(finite(p.ringPitch, 180), 1, 10000); add(rr * Math.cos(theta), rr * Math.sin(theta), r, i);
    }
  } else if (p.layout === 'spiral') {
    for (let i = 0; i < count; i++) { const theta = i * 2.399963229728653, rr = px * Math.sqrt(i); add(rr * Math.cos(theta), rr * Math.sin(theta), 0, i); }
  } else for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let x = (c - (cols - 1) / 2) * px, y = (r - (rows - 1) / 2) * py;
    if (p.layout === 'hex') { x += (r % 2 - .5) * px / 2; y *= Math.sqrt(3) / 2; }
    if (p.layout !== 'perimeter' || r === 0 || c === 0 || r === rows - 1 || c === cols - 1) add(x, y, r, c);
  }
  return contacts;
}
export function contactArea(c) {
  if (c.shape === 'ring') return Math.PI * (c.w ** 2 - c.inner ** 2) / 4;
  if (c.shape === 'circle') return Math.PI * c.w ** 2 / 4;
  if (c.shape === 'ellipse') return Math.PI * c.w * c.h / 4;
  return c.w * (c.shape === 'square' ? c.w : c.h);
}
export function contactBounds(c, inflate = 0) {
  const a = c.rotation * Math.PI / 180, w = c.w / 2, h = (c.shape === 'circle' || c.shape === 'ring' || c.shape === 'square' ? c.w : c.h) / 2;
  const ex = c.shape === 'circle' || c.shape === 'ring' ? w : c.shape === 'ellipse' ? Math.hypot(w * Math.cos(a), h * Math.sin(a)) : Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
  const ey = c.shape === 'circle' || c.shape === 'ring' ? h : c.shape === 'ellipse' ? Math.hypot(w * Math.sin(a), h * Math.cos(a)) : Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  return { minX: c.x - ex - inflate, maxX: c.x + ex + inflate, minY: c.y - ey - inflate, maxY: c.y + ey + inflate };
}
export function layoutBounds(contacts, pads = [], margin = 0) {
  if (!contacts.length && !pads.length) return { minX: -500, minY: -500, maxX: 500, maxY: 500 };
  const boxes = contacts.map(c => contactBounds(c)).concat(pads.map(p => ({ minX: p.x - p.w / 2, maxX: p.x + p.w / 2, minY: p.y - p.h / 2, maxY: p.y + p.h / 2 })));
  return { minX: Math.min(...boxes.map(b => b.minX)) - margin, maxX: Math.max(...boxes.map(b => b.maxX)) + margin, minY: Math.min(...boxes.map(b => b.minY)) - margin, maxY: Math.max(...boxes.map(b => b.maxY)) + margin };
}
export const pointInBounds = (p, b) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;
export function hitContact(c, x, y) {
  const a = -c.rotation * Math.PI / 180, dx = x - c.x, dy = y - c.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  if (c.shape === 'circle' || c.shape === 'ring') return Math.hypot(dx, dy) <= c.w / 2;
  if (c.shape === 'ellipse') return (lx / (c.w / 2)) ** 2 + (ly / (c.h / 2)) ** 2 <= 1;
  return Math.abs(lx) <= c.w / 2 && Math.abs(ly) <= (c.shape === 'square' ? c.w : c.h) / 2;
}
// Snap to the conductive area, including the wall of an annulus rather than its hole.
export function contactPort(c, side, overlap = 1) {
  const dir = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] }[side];
  const angle = -c.rotation * Math.PI / 180, dx = dir[0] * Math.cos(angle) - dir[1] * Math.sin(angle), dy = dir[0] * Math.sin(angle) + dir[1] * Math.cos(angle);
  let distance;
  if (c.shape === 'circle' || c.shape === 'ring') distance = c.w / 2;
  else if (c.shape === 'ellipse') distance = 1 / Math.sqrt((dx / (c.w / 2)) ** 2 + (dy / (c.h / 2)) ** 2);
  else distance = Math.min(Math.abs(dx) < 1e-10 ? Infinity : c.w / 2 / Math.abs(dx), Math.abs(dy) < 1e-10 ? Infinity : (c.shape === 'square' ? c.w : c.h) / 2 / Math.abs(dy));
  const inset = c.shape === 'ring' ? Math.min(overlap, (c.w - c.inner) / 4) : Math.min(overlap, distance / 2);
  return { x: c.x + dir[0] * (distance - inset), y: c.y + dir[1] * (distance - inset) };
}
export function assignPads(contacts, routing) {
  const b = layoutBounds(contacts), cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const groups = Object.fromEntries(SIDES.map(s => [s, []]));
  contacts.forEach((c, i) => {
    let side = c.exit;
    if (side === 'auto') {
      if (SIDES.includes(routing.arrangement)) side = routing.arrangement;
      else if (routing.arrangement === 'split-lr') side = c.x < cx ? 'left' : 'right';
      else if (routing.arrangement === 'split-tb') side = c.y < cy ? 'top' : 'bottom';
      else if (routing.arrangement === 'interleave-lr') side = i % 2 ? 'right' : 'left';
      else if (routing.arrangement === 'rows-lr') side = c.row % 2 ? 'right' : 'left';
      else if (routing.arrangement === 'cols-tb') side = c.col % 2 ? 'bottom' : 'top';
      else side = [{ s: 'left', d: c.x - b.minX }, { s: 'right', d: b.maxX - c.x }, { s: 'top', d: c.y - b.minY }, { s: 'bottom', d: b.maxY - c.y }].sort((a, z) => a.d - z.d)[0].s;
    }
    groups[side].push({ c, originalIndex: i });
  });
  const pads = [];
  for (const side of SIDES) {
    const horizontal = side === 'left' || side === 'right';
    groups[side].sort((a, z) => routing.order === 'id' ? a.originalIndex - z.originalIndex : routing.order === 'column' ? a.c.col - z.c.col || a.c.row - z.c.row : routing.order === 'snake' ? a.c.row - z.c.row || (a.c.row % 2 ? z.c.col - a.c.col : a.c.col - z.c.col) : (horizontal ? a.c.y - z.c.y || a.c.x - z.c.x : a.c.x - z.c.x || a.c.y - z.c.y));
    if (routing.order === 'reverse') groups[side].reverse();
    groups[side].forEach(({ c, originalIndex }, i) => {
      const t = (i - (groups[side].length - 1) / 2) * routing.padPitch + routing.padOffset;
      pads.push({ id: `P-${c.id}`, contactId: c.id, side, channel: originalIndex + 1, x: horizontal ? (side === 'left' ? b.minX - routing.bankDistance : b.maxX + routing.bankDistance) : cx + t, y: horizontal ? cy + t : (side === 'top' ? b.minY - routing.bankDistance : b.maxY + routing.bankDistance), w: horizontal ? routing.padHeight : routing.padWidth, h: horizontal ? routing.padWidth : routing.padHeight });
    });
  }
  return pads;
}
export function parseDesign(input) {
  if (!input || input.schema !== 'bts-neural-interface' || input.version !== 1 || !Array.isArray(input.contacts)) throw Error('Choose a version 1 Neural Interface Designer JSON file.');
  if (input.units && !['µm', 'um'].includes(input.units)) throw Error('Design coordinates must be in micrometers (µm).');
  if (input.contacts.length > MAX_CONTACTS) throw Error(`Design exceeds ${MAX_CONTACTS} contacts.`);
  const contacts = input.contacts.map(normalizedContact);
  if (new Set(contacts.map(c => c.id)).size !== contacts.length) throw Error('Contact IDs must be unique.');
  return { name: String(input.name ?? 'Untitled interface').slice(0, 100), contacts, routing: normalizeRouting(input.routing) };
}
