import { sampleAt, activityAt } from './model.mjs';

/**
 * The bulk geometry and recording-contact coordinates in this view are the
 * coordinates used by the numerical model (millimetres). Fibres, endplates,
 * and terminal arbors are a reproducible representative drawing, not histology.
 * In particular, there is no distal nerve stump: a terminal nerve enters each
 * independent free-muscle RPNI graft.
 */
export const RPNI_COLORS = Object.freeze({
  background: '#252522', ink: '#e8e1d1', muted: '#b5ae9b', brass: '#d8b77b',
  nerve: '#d5c797', muscle: '#a96860', muscleLight: '#d29a83',
  teal: '#69b4a6', contact: '#d7d9cc', selected: '#fff5c2',
  oxygen: '#8aaeb3', scar: '#a57e70', lead: '#9fa7a3',
});
export const SOURCE_COLORS = ['#69b4a6', '#d8b77b', '#a8a1cf', '#db9684'];

export const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const idKey = (value) => String(value ?? '');
export function seededValue(value) {
  let h = 2166136261;
  for (const character of String(value)) { h ^= character.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
export function sourceColor(unit, result) {
  const numericPool = Number(unit?.sourcePoolId);
  if (Number.isInteger(numericPool) && numericPool >= 0) return SOURCE_COLORS[numericPool % SOURCE_COLORS.length];
  const pools = [...new Set((result?.motorUnits || []).map((item) => idKey(item.sourcePoolId)))];
  return SOURCE_COLORS[Math.max(0, pools.indexOf(idKey(unit?.sourcePoolId))) % SOURCE_COLORS.length];
}
function vector(value, fallback = [0, 0, 0]) {
  return [0, 1, 2].map((axis) => finite(value?.[axis], fallback[axis]));
}
export function abbreviateId(value, prefix = '') {
  const id = String(value ?? '');
  return `${prefix}${id.length > 13 ? `${id.slice(0, 10)}…` : id}`;
}

/** Static, deterministic display sample, constructed once per simulation. */
export function buildRpniAnatomy(result) {
  if (!result?.geometry?.modules?.length) return { modules: [], contacts: [], bounds: { min: [-10, -5, -3], max: [10, 5, 3] }, representativeCount: 0 };
  const allUnits = result.motorUnits || [];
  const contacts = (result.geometry.contacts || []).map((contact) => ({
    ...contact, id: contact.id, positionMm: vector(contact.positionMm),
    radiusMm: Math.max(0, finite(contact.radiusMm, .3)),
  }));
  const modules = result.geometry.modules.map((module, moduleIndex) => {
    const center = vector(module.centerMm);
    const dimensions = vector(module.dimensionsMm, [30, 10, 4]).map((value) => Math.max(.1, value));
    const [length, width, thickness] = dimensions;
    const entry = vector(module.nerveEntryMm, [center[0] - length / 2, center[1], center[2]]);
    const tip = vector(module.nerveTipMm, [entry[0] + Math.min(3, length / 4), entry[1], entry[2]]);
    const units = allUnits.filter((unit) => idKey(unit.moduleId) === idKey(module.id));
    const sampleCount = Math.min(18, units.length);
    const shownUnits = Array.from({ length: sampleCount }, (_, index) => units[Math.floor(index * units.length / sampleCount)]);
    const nerveRadius = Math.max(.08, finite(module.nerveRadiusMm,
      finite(module.nerveDiameterMm, finite(result.config?.nerveDiameterMm, 1.5)) / 2));
    const leadStartX = finite(result.geometry?.boundsMm?.min?.[0], entry[0] - 8);
    const nerveStart = [Math.min(entry[0] - 1, leadStartX), entry[1], entry[2]];
    const fibres = [];
    // Show a bounded sample of the ACTUAL three-fibre quadrature used by the
    // source model. Activity is not painted onto unrelated procedural fibres.
    // Display diameters are enlarged; the apparent count is not histology.
    for (const unit of shownUnits) {
      const members = unit.members?.length ? unit.members : [{ id: `${unit.id}:center`,
        fiberStartMm: unit.fiberStartMm, fiberEndMm: unit.fiberEndMm }];
      for (const member of members) {
        const start = vector(member.fiberStartMm, [center[0] - length * .47, ...vector(unit.territoryCenterMm, center).slice(1)]);
        const end = vector(member.fiberEndMm, [center[0] + length * .47, start[1], start[2]]);
        fibres.push({ id: member.id, unitId: unit.id, sourcePoolId: unit.sourcePoolId,
          y: start[1], z: start[2], startX: start[0], endX: end[0],
          radiusMm: Math.min(width / 100, thickness / 24, .105) * (.75 + seededValue(member.id) * .45),
          bendMm: 0, phase: 0,
        });
      }
    }
    const arbors = shownUnits.map((unit) => {
      const end = vector(unit.territoryCenterMm, center);
      const bend = .07 * (seededValue(`${unit.id}branch`) - .5) * width;
      const points = Array.from({ length: 17 }, (_, index) => {
        const t = index / 16, s = t * t * (3 - 2 * t);
        return [tip[0] + (end[0] - tip[0]) * t,
          tip[1] + (end[1] - tip[1]) * s + Math.sin(t * Math.PI) * bend,
          tip[2] + (end[2] - tip[2]) * s];
      });
      return { unit, points };
    });
    return { ...module, index: moduleIndex, centerMm: center, dimensionsMm: dimensions,
      nerveEntryMm: entry, nerveTipMm: tip, nerveStartMm: nerveStart, nerveRadiusMm: nerveRadius,
      units, shownUnits, fibres, arbors, contacts: contacts.filter((contact) => idKey(contact.moduleId) === idKey(module.id)) };
  });
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const module of modules) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], module.centerMm[axis] - module.dimensionsMm[axis] / 2);
      max[axis] = Math.max(max[axis], module.centerMm[axis] + module.dimensionsMm[axis] / 2);
    }
    min[0] = Math.min(min[0], module.nerveStartMm[0]);
  }
  for (const contact of contacts) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], contact.positionMm[axis] - contact.radiusMm);
    max[axis] = Math.max(max[axis], contact.positionMm[axis] + contact.radiusMm);
  }
  return { modules, contacts, bounds: { min, max }, representativeCount: modules.reduce((sum, module) => sum + module.fibres.length, 0) };
}

export function sampleRpniView(result, day, timeMs) {
  if (!result) return { sample: null, unitStates: new Map() };
  const sample = sampleAt(result, day);
  const activity = activityAt(result, day, timeMs);
  return { sample, activity, unitStates: new Map((activity?.units || []).map((unit) => [idKey(unit.id), unit])) };
}
export function stateFor(snapshot, unit) {
  return snapshot?.unitStates?.get(idKey(typeof unit === 'object' ? unit?.id : unit)) || { activation: 0, growthFraction: 0, wavefrontsMm: [] };
}
export function partialPath(points, fraction) {
  const f = clamp(finite(fraction));
  if (f <= 0 || points.length < 2) return [];
  if (f >= 1) return points;
  const position = f * (points.length - 1), whole = Math.floor(position), part = position - whole;
  const out = points.slice(0, whole + 1), a = points[whole], b = points[Math.min(whole + 1, points.length - 1)];
  out.push(a.map((value, axis) => value + (b[axis] - value) * part));
  return out;
}
export function contactRole(result, contactId) {
  const channel = (result?.geometry?.channels || result?.channels || []).find((item) =>
    idKey(item.positiveContactId) === idKey(contactId) || idKey(item.negativeContactId) === idKey(contactId));
  if (!channel) return { sign: '', channelId: null };
  return { sign: idKey(channel.positiveContactId) === idKey(contactId) ? '+' : '−', channelId: channel.id };
}
export function niceScale(pixelsPerMm, maximumPixels = 90) {
  const target = maximumPixels / Math.max(pixelsPerMm, .001);
  const exponent = 10 ** Math.floor(Math.log10(target));
  return [5, 2, 1].map((value) => value * exponent).find((value) => value <= target) || exponent / 2;
}

function formatMm(value) { return `${Number(value.toFixed(2))} mm`; }

export function createRpniFallback(container, { onSelect = () => {} } = {}) {
  if (!container) throw new Error('The RPNI viewer needs a container.');
  container.querySelector('.rpni-scene-loading, .rp-loading')?.remove();
  const canvas = document.createElement('canvas');
  canvas.className = 'rpni-anatomy-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline-offset:-3px;';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive RPNI anatomy. Each terminal nerve enters a separate free muscle graft. Click a recording contact to inspect it. Arrow keys select contacts; Home resets the view.');
  container.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); throw new Error('A two-dimensional canvas is required for the anatomy view.'); }
  const abort = new AbortController();
  let result = null, anatomy = buildRpniAnatomy(null), snapshot = null;
  let day = 0, timeMs = 0, selectedId = null, disposed = false, drawRequest = 0;
  let width = 1, height = 1, ratio = 1, zoom = 1, panX = 0, panY = 0;
  let pointerDown = null, hits = [], hoverId = null, pinch = null;
  const pointers = new Map();
  const options = { view: 'longitudinal', showNerve: true, showTerritories: true,
    showElectrodes: true, showOxygen: false, showLabels: true, selectedElectrodeId: null, sectionFraction: .5 };
  const requestDraw = () => {
    if (!drawRequest && !disposed) drawRequest = requestAnimationFrame(() => { drawRequest = 0; draw(); });
  };
  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    requestDraw();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  function text(value, x, y, { size = 10, color = RPNI_COLORS.muted, align = 'left', alpha = 1, weight = '' } = {}) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `${weight ? `${weight} ` : ''}${size}px "URW Gothic",Arial,sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
    ctx.fillText(String(value), x, y); ctx.restore();
  }
  function line(points, color, lineWidth = 1, alpha = 1, dash = []) {
    if (points.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
    ctx.stroke(); ctx.restore();
  }
  function ellipse(x, y, rx, ry, fill, stroke, alpha = 1, lineWidth = .8) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.lineWidth = lineWidth;
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(.15, rx), Math.max(.15, ry), 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    ctx.restore();
  }
  function box(x, y, w, h, fill, stroke, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
    if (stroke) { ctx.lineWidth = .85; ctx.strokeStyle = stroke; ctx.strokeRect(x, y, w, h); }
    ctx.restore();
  }
  function planCoordinates() {
    const { min, max } = anatomy.bounds;
    const availableWidth = Math.max(30, width - 72), availableHeight = Math.max(30, height - 156);
    const unit = Math.max(.1, Math.min(availableWidth / Math.max(1, max[0] - min[0]),
      availableHeight / Math.max(1, max[1] - min[1] + 2))) * zoom;
    const centerX = (min[0] + max[0]) / 2, centerY = (min[1] + max[1]) / 2;
    return { unit, X: (x) => width / 2 + (x - centerX) * unit + panX,
      Y: (y) => (height - 10) / 2 - (y - centerY) * unit + panY };
  }
  function drawNerve(module, coordinates) {
    if (!options.showNerve) return;
    const { X, Y, unit } = coordinates, [sx, sy] = module.nerveStartMm, [tx, ty] = module.nerveTipMm;
    const radius = module.nerveRadiusMm * unit;
    const gradient = ctx.createLinearGradient(0, Y(sy) - radius, 0, Y(sy) + radius);
    gradient.addColorStop(0, '#d5c79788'); gradient.addColorStop(.38, '#e6d9af'); gradient.addColorStop(1, '#867a58');
    box(X(sx), Y(sy) - radius, X(tx) - X(sx), radius * 2, gradient, '#e2d5ad88');
    ellipse(X(sx), Y(sy), Math.min(radius * .25, 2), radius, '#c0ae7f', '#eadbb8');
    ellipse(X(tx), Y(ty), Math.min(radius * .25, 2), radius, '#b8a776', '#eadbb8');
    for (let lane = -1; lane <= 1; lane++) line([[X(sx), Y(sy) + lane * radius * .44], [X(tx), Y(ty) + lane * radius * .44]], '#fff0c5', .6, .6);
    // Two fine ligature marks indicate the illustrative entry location. They
    // are not a proposed suture placement or a prediction of surgical fixation.
    const entryX = X(module.nerveEntryMm[0]);
    line([[entryX - 1.5, Y(sy) - radius * 1.35], [entryX + 1.5, Y(sy) + radius * 1.35]], '#7e9b99', 1.1, .9);
  }
  function drawTerritories(module, coordinates, transverse = false) {
    if (!options.showTerritories) return;
    const { unit } = coordinates;
    for (const motorUnit of module.shownUnits) {
      const center = vector(motorUnit.territoryCenterMm, module.centerMm), radius = Math.max(.08, finite(motorUnit.territoryRadiusMm, .8));
      const state = stateFor(snapshot, motorUnit), activation = clamp(finite(state.activation));
      const color = sourceColor(motorUnit, result);
      if (transverse) {
        const [px, py] = coordinates.project(center);
        ellipse(px, py, Math.min(radius, module.dimensionsMm[1] * .22) * unit,
          Math.min(radius, module.dimensionsMm[2] * .36) * unit, color, color, .035 + activation * .09);
      } else {
        const [x, y] = center;
        ellipse(coordinates.X(x), coordinates.Y(y), Math.min(module.dimensionsMm[0] * .065, radius * 1.5) * unit,
          Math.min(radius, module.dimensionsMm[1] * .18) * unit, color, color, .035 + activation * .1);
      }
    }
  }
  function drawPlan() {
    const coordinates = planCoordinates(), { X, Y, unit } = coordinates;
    hits = [];
    for (const module of [...anatomy.modules].reverse()) {
      const [cx, cy] = module.centerMm, [length, graftWidth, thickness] = module.dimensionsMm;
      const left = X(cx - length / 2), top = Y(cy + graftWidth / 2), w = length * unit, h = graftWidth * unit;
      const gradient = ctx.createLinearGradient(left, top, left, top + h);
      gradient.addColorStop(0, '#bc817069'); gradient.addColorStop(.4, '#965f554a'); gradient.addColorStop(1, '#613f3d80');
      box(left, top, w, h, gradient, '#dca18a8a');
      // Fibre end rows and subtle connective-tissue boundary show that this is
      // skeletal muscle, not a nerve tube or a regenerated distal nerve trunk.
      line([[left + 1, top + 2], [left + w - 1, top + 2]], '#e6bba0', .8, .45);
      line([[left + 1, top + h - 2], [left + w - 1, top + h - 2]], '#b88877', .8, .5);
      ctx.save(); ctx.beginPath(); ctx.rect(left + .6, top + .6, Math.max(1, w - 1.2), Math.max(1, h - 1.2)); ctx.clip();
      drawTerritories(module, coordinates);
      const visibleFibres = module.fibres;
      for (const fibre of visibleFibres) {
        const points = [];
        for (let k = 0; k <= 20; k++) {
          const x = fibre.startX + (fibre.endX - fibre.startX) * k / 20;
          const y = fibre.y + Math.sin(k / 20 * Math.PI * 2 + fibre.phase) * fibre.bendMm;
          points.push([X(x), Y(y)]);
        }
        const state = stateFor(snapshot, fibre.unitId), active = clamp(finite(state.activation));
        const arrived = finite(state.growthFraction) >= 1;
        const thicknessPixels = Math.max(.6, fibre.radiusMm * unit * 1.7);
        line(points, arrived ? '#ce9280' : '#a47c6c', thicknessPixels, .42 + .3 * (fibre.z - module.centerMm[2]) / thickness + active * .16);
        for (let s = 0; s < 29; s++) {
          const x = fibre.startX + (fibre.endX - fibre.startX) * (s + .4) / 29;
          const y = fibre.y + Math.sin((s + .4) / 29 * Math.PI * 2 + fibre.phase) * fibre.bendMm;
          line([[X(x), Y(y) - thicknessPixels * .8], [X(x), Y(y) + thicknessPixels * .8]], '#edbea0', .55, .23);
        }
        // The two fronts come from the same seeded spikes and propagation speed
        // as the electrophysiology; the viewer never advances its own clock.
        if (active > .01) for (const front of state.wavefrontsMm || []) {
          const x = finite(typeof front === 'number' ? front : front?.xMm, NaN);
          if (!Number.isFinite(x) || x < fibre.startX || x > fibre.endX) continue;
          const span = Math.min(.65, length * .035);
          line([[X(Math.max(fibre.startX, x - span)), Y(fibre.y)], [X(Math.min(fibre.endX, x + span)), Y(fibre.y)]],
            sourceColor({ sourcePoolId: fibre.sourcePoolId }, result), Math.max(1.3, thicknessPixels * 1.7), .45 + active * .55);
        }
      }
      if (options.showOxygen) {
        const centerRatio = clamp(finite(snapshot?.sample?.oxygenCenterRatio, 1));
        // In the x–y mid-plane, the slab solution is spatially constant. A
        // y-gradient here would incorrectly imply diffusion across graft width.
        box(left, top, w, h, `rgba(118,163,181,${.4 * (1 - centerRatio)})`);
      }
      if (options.showNerve) for (const arbor of module.arbors) {
        const state = stateFor(snapshot, arbor.unit), path = partialPath(arbor.points, state.growthFraction);
        const color = sourceColor(arbor.unit, result);
        if (options.showTerritories) line(arbor.points.map(([x, y]) => [X(x), Y(y)]), color, .65, .16, [2, 4]);
        line(path.map(([x, y]) => [X(x), Y(y)]), color, .85, .75);
        if (finite(state.growthFraction) >= 1) {
          const end = arbor.points[arbor.points.length - 1];
          const active = clamp(finite(state.activation));
          ellipse(X(end[0]), Y(end[1]), Math.max(1.3, unit * .12), Math.max(.7, unit * .065), color, active > .2 ? RPNI_COLORS.selected : null, .6 + .4 * active);
        }
      }
      ctx.restore();
      drawNerve(module, coordinates);
      if (options.showElectrodes) for (const contact of module.contacts) drawPlanContact(contact, module, coordinates);
      if (options.showLabels) {
        const labelY = top - 10;
        text(`GRAFT ${module.index + 1}`, left + w, labelY, { align: 'right', size: 9, color: RPNI_COLORS.ink });
        if (anatomy.modules.length <= 2 && width > 430 && top + h + 11 < height - 88) text(`${length} × ${graftWidth} × ${thickness} mm`, left + w, top + h + 11, { size: 9, align: 'right' });
      }
    }
    if (options.showLabels && anatomy.modules.length) {
      const first = anatomy.modules[anatomy.modules.length - 1];
      const [sx, sy] = first.nerveStartMm;
      text('TERMINAL NERVE', X(sx), Y(sy + first.nerveRadiusMm) - 13, { size: width < 470 ? 8 : 9, color: RPNI_COLORS.brass });
      const tip = first.nerveTipMm;
      if (width > 560 && anatomy.modules.length < 3) {
        text('intramuscular terminal branches', X(tip[0]) + 10, Y(first.centerMm[1] - first.dimensionsMm[1] / 2) + 25, { size: 9, color: RPNI_COLORS.teal });
      }
    }
    drawScale(unit, 'x / y');
    drawAxes(width - 35, height - 48, 'x', 'y');
  }
  function drawPlanContact(contact, module, coordinates) {
    const { X, Y, unit } = coordinates, [x, y, z] = contact.positionMm;
    const px = X(x), py = Y(y), radius = Math.max(.2, contact.radiusMm * unit);
    const selected = idKey(contact.id) === idKey(selectedId), hover = idKey(contact.id) === idKey(hoverId);
    const role = contactRole(result, contact.id);
    // Contact normals are z; in plan the equivalent circular contact area is
    // seen face-on. The lead is display-only, and is not a volume conductor.
    const leadEnd = [px + 5, Y(module.centerMm[1] + module.dimensionsMm[1] / 2) - 5];
    line([[px, py], [px, py - 7], leadEnd], selected ? RPNI_COLORS.brass : RPNI_COLORS.lead, 1.2, .8);
    ellipse(px, py, radius, radius, selected ? RPNI_COLORS.selected : RPNI_COLORS.contact, '#252522', 1, .9);
    ellipse(px, py, Math.max(4, radius + (selected ? 4 : 2)), Math.max(4, radius + (selected ? 4 : 2)), null,
      selected ? RPNI_COLORS.brass : hover ? RPNI_COLORS.selected : '#c9d4ca55', 1, selected ? 1.5 : .8);
    if (options.showLabels && (width > 400 || selected)) text(`${abbreviateId(role.channelId || contact.id)}${role.sign}`, px + radius + 5, py + (role.sign === '+' ? -8 : 9), { size: 9, color: selected ? RPNI_COLORS.selected : '#d5d7c8' });
    hits.push({ id: contact.id, point: [px, py], radius: Math.max(9, radius + 4), contact, depth: z - module.centerMm[2] });
  }
  function sectionCoordinates() {
    const minY = Math.min(...anatomy.modules.map((module) => module.centerMm[1] - module.dimensionsMm[1] / 2));
    const maxY = Math.max(...anatomy.modules.map((module) => module.centerMm[1] + module.dimensionsMm[1] / 2));
    const minZ = Math.min(...anatomy.modules.map((module) => module.centerMm[2] - module.dimensionsMm[2] / 2));
    const maxZ = Math.max(...anatomy.modules.map((module) => module.centerMm[2] + module.dimensionsMm[2] / 2));
    const unit = Math.max(.1, Math.min((width - 72) / Math.max(1, maxY - minY), (height - 152) / Math.max(1, maxZ - minZ))) * zoom;
    return { unit, project: ([, y, z]) => [width / 2 + (y - (minY + maxY) / 2) * unit + panX,
      height * .48 - (z - (minZ + maxZ) / 2) * unit + panY] };
  }
  function drawSection() {
    hits = [];
    if (!anatomy.modules.length) return;
    const coordinates = sectionCoordinates(), { unit, project } = coordinates;
    for (const module of anatomy.modules) {
      const [length, graftWidth, thickness] = module.dimensionsMm;
      const sectionX = module.centerMm[0] + (options.sectionFraction - .5) * length;
      const [left, top] = project([sectionX, module.centerMm[1] - graftWidth / 2, module.centerMm[2] + thickness / 2]);
      const w = graftWidth * unit, h = thickness * unit;
      const gradient = ctx.createLinearGradient(left, top, left + w, top + h);
      gradient.addColorStop(0, '#a677657a'); gradient.addColorStop(.5, '#68493f9a'); gradient.addColorStop(1, '#b47a657a');
      box(left, top, w, h, gradient, '#d5a28a');
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, w, h); ctx.clip();
      drawTerritories(module, coordinates, true);
      for (const fibre of module.fibres) {
        if (sectionX < fibre.startX || sectionX > fibre.endX) continue;
        const [px, py] = project([sectionX, fibre.y, fibre.z]);
        const state = stateFor(snapshot, fibre.unitId), active = clamp(finite(state.activation));
        const radius = Math.max(.9, fibre.radiusMm * unit);
        const color = active > .08 ? sourceColor({ sourcePoolId: fibre.sourcePoolId }, result) : '#c88d77';
        ellipse(px, py, radius * 1.1, radius, color, '#f4c49a66', .6 + active * .4);
        ellipse(px + radius * .6, py, Math.max(.4, radius * .16), Math.max(.4, radius * .2), '#e9cab0', null, .55);
      }
      if (options.showOxygen) {
        const gradientOxygen = ctx.createLinearGradient(0, top, 0, top + h);
        const profile = result.oxygen?.profile || [];
        for (const point of [...profile].reverse()) {
          const offset = clamp(.5 - finite(point.zMm) / thickness);
          const value = clamp(finite(point.ratio, 1));
          gradientOxygen.addColorStop(offset, `rgba(118,163,181,${.55 * (1 - value)})`);
        }
        box(left, top, w, h, gradientOxygen);
      }
      if (options.showNerve && sectionX >= module.nerveEntryMm[0] && sectionX <= module.nerveTipMm[0]) {
        const [nx, ny] = project(module.nerveTipMm), nr = module.nerveRadiusMm * unit;
        ellipse(nx, ny, nr, nr, '#b6a676', '#e5d8ad', .95);
        for (let i = 0; i < 9; i++) {
          const angle = i * 2.39996, r = nr * Math.sqrt((i + .5) / 10) * .7;
          ellipse(nx + Math.cos(angle) * r, ny + Math.sin(angle) * r, Math.max(.5, nr * .1), Math.max(.5, nr * .1), '#f0dba0');
        }
      }
      ctx.restore();
      if (options.showElectrodes) for (const contact of module.contacts) {
        const [px, py] = project(contact.positionMm), radius = Math.max(.2, contact.radiusMm * unit);
        const selected = idKey(contact.id) === idKey(selectedId), role = contactRole(result, contact.id);
        const dx = contact.positionMm[0] - sectionX;
        // Every recording contact is projected along x into this plane, never
        // silently moved in the model. Its out-of-plane distance is disclosed.
        line([[px, py], [px, top - 9]], '#b0bbb1', 1, .7, [3, 3]);
        box(px - radius, py - Math.max(1, unit * .04), radius * 2, Math.max(2, unit * .08), selected ? RPNI_COLORS.selected : RPNI_COLORS.contact, '#252522');
        ellipse(px, py, radius + 4, radius + 4, null, selected ? RPNI_COLORS.brass : '#d5d9c966', 1, selected ? 1.5 : .8);
        const rank = module.contacts.findIndex((item) => idKey(item.id) === idKey(contact.id));
        if (options.showLabels) {
          const labelY = top - 22, labelX = px + (rank - (module.contacts.length - 1) / 2) * Math.min(38, w * .4);
          line([[px, py], [labelX, labelY + 9]], selected ? RPNI_COLORS.brass : '#c0c8b8', .7, .65, [2, 3]);
          box(labelX - 15, labelY - 8, 30, 16, '#252522e8', selected ? '#d8b77b' : '#949f875c');
          text(`${abbreviateId(role.channelId || contact.id)}${role.sign}`, labelX, labelY, { align: 'center', size: 9, color: selected ? RPNI_COLORS.selected : RPNI_COLORS.ink });
          // Bipolar contacts can overlap exactly in the transverse projection.
          // Separate label hit targets keep both physical contacts selectable.
          hits.push({ id: contact.id, point: [labelX, labelY], radius: 12, contact, dx });
        }
        hits.push({ id: contact.id, point: [px, py], radius: Math.max(10, radius + 4), contact, dx });
      }
      if (options.showLabels) {
        text(`G${module.index + 1}`, left + w / 2, top + h + 13, { size: 9, align: 'center', color: RPNI_COLORS.ink });
        if (anatomy.modules.length < 3) text(`${graftWidth} × ${thickness} mm · x ${Number(sectionX.toFixed(1))}`, left + w / 2, top + h + 29, { size: 9, align: 'center' });
      }
    }
    drawScale(unit, 'y / z');
    drawAxes(width - 35, height - 48, 'y', 'z');
  }
  function drawScale(unit, axes) {
    const scale = niceScale(unit, Math.min(90, width * .22)), x = 18, y = height - 53;
    const pixels = scale * unit;
    line([[x, y - 3], [x, y + 3], [x, y], [x + pixels, y], [x + pixels, y - 3], [x + pixels, y + 3]], '#d8c8a5', 1);
    text(`${formatMm(scale)} · ${axes}`, x, y + 13, { size: 9 });
  }
  function drawAxes(x, y, horizontal, vertical) {
    line([[x - 17, y], [x + 3, y], [x, y - 2], [x + 3, y], [x, y + 2]], RPNI_COLORS.brass, .8);
    line([[x - 17, y], [x - 17, y - 19], [x - 19, y - 16], [x - 17, y - 19], [x - 15, y - 16]], RPNI_COLORS.teal, .8);
    text(horizontal, x + 10, y, { size: 9, color: RPNI_COLORS.brass });
    text(vertical, x - 17, y - 26, { size: 9, align: 'center', color: RPNI_COLORS.teal });
    const normal = ['x', 'y', 'z'].find((axis) => axis !== horizontal && axis !== vertical);
    ellipse(x - 17, y, 2.8, 2.8, '#252522', '#b2a6cf', 1, .7);
    ellipse(x - 17, y, .6, .6, '#b2a6cf');
    text(normal, x - 27, y + 10, { size: 9, color: '#b2a6cf' });
  }
  function drawSelection() {
    const contact = anatomy.contacts.find((item) => idKey(item.id) === idKey(selectedId));
    if (!contact) return;
    const role = contactRole(result, contact.id), [x, y, z] = contact.positionMm;
    const compact = width < 490;
    let label = compact ? `${abbreviateId(contact.id)} · (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) mm`
      : `${abbreviateId(contact.id)} · ${role.channelId || 'recording'}${role.sign} · x ${x.toFixed(2)} / y ${y.toFixed(2)} / z ${z.toFixed(2)} mm`;
    if (options.view === 'transverse' && width > 650) {
      const module = anatomy.modules.find((item) => idKey(item.id) === idKey(contact.moduleId));
      if (module) label += ` · Δx ${formatMm(x - module.centerMm[0] - (options.sectionFraction - .5) * module.dimensionsMm[0])}`;
    }
    text(label, width / 2, height - 72, { size: compact ? 8 : 9, align: 'center', color: RPNI_COLORS.selected });
  }
  function draw() {
    if (disposed) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#292b27'); background.addColorStop(.56, '#252522'); background.addColorStop(1, '#20231f');
    box(0, 0, width, height, background);
    if (width < 80 || height < 120) return;
    const transverse = options.view === 'transverse';
    text(transverse ? 'TRANSVERSE · y–z PLANE' : 'LONGITUDINAL · x–y PLANE', 16, 20, { size: width < 430 ? 9 : 10, color: RPNI_COLORS.ink });
    text(`DAY ${Number(day.toFixed(1))} · ${Number(timeMs.toFixed(0))} ms`, width - 16, 20, { size: 9, align: 'right', color: RPNI_COLORS.brass });
    line([[16, 31], [width - 16, 31]], '#c5baa0', .6, .2);
    if (!result) { text('Preparing graft geometry…', width / 2, height / 2, { size: 13, align: 'center' }); return; }
    text('SOURCES', 16, 43, { size: 8 });
    anatomy.modules.forEach((module, index) => {
      const x = 72 + index * Math.min(67, (width - 88) / Math.max(1, anatomy.modules.length));
      box(x, 40, 6, 6, sourceColor({ sourcePoolId: module.id }, result));
      text(`pool ${index + 1}${Number(result.config.targetModule) === Number(module.id) ? ' target' : ''}`, x + 10, 43, { size: 8, color: '#c8c5b7' });
    });
    snapshot = sampleRpniView(result, day, timeMs);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 53, width, height - 89); ctx.clip();
    if (transverse) drawSection(); else drawPlan();
    ctx.restore();
    drawSelection();
    const compact = width < 560;
    if (options.showOxygen) text(`O₂ ${transverse ? 'slab profile across z' : 'mid-plane tint'} · center / surface ${(100 * clamp(finite(snapshot?.sample?.oxygenCenterRatio, 1))).toFixed(1)}%`, 16, height - 24, { size: compact ? 8 : 9, color: '#a8c2c9' });
    else if (transverse) text(compact ? 'Contacts projected along x; same model coordinates.' : 'Mid-graft section · contacts projected along x; selecting a contact shows its exact coordinates.', 16, height - 24, { size: compact ? 8 : 9 });
    else text(compact ? 'Bulk dimensions in mm · drag / pinch to explore' : 'Bulk dimensions in mm · terminal nerve enters each free muscle graft · drag to pan / scroll to zoom', 16, height - 24, { size: compact ? 8 : 9 });
    text(compact ? 'Representative fibers / terminal arbors; display diameters enlarged.' : 'Representative skeletal-muscle fibers and synthetic motor-unit territories; fiber / terminal-arbor diameters enlarged.', 16, height - 11, { size: compact ? 7.5 : 8.5, color: '#a49f8f' });
  }
  function selectContact(id) {
    selectedId = id; options.selectedElectrodeId = id;
    const contact = anatomy.contacts.find((item) => idKey(item.id) === idKey(id));
    if (contact) canvas.setAttribute('aria-label', `Selected recording contact ${contact.id}, coordinates ${contact.positionMm.map((value) => value.toFixed(2)).join(', ')} millimetres. Arrow keys select other contacts; Home resets view.`);
    requestDraw(); onSelect(id);
  }
  function hitAt(x, y) {
    let closest = null, distance = Infinity;
    for (const hit of hits) {
      const d = Math.hypot(x - hit.point[0], y - hit.point[1]);
      if (d <= hit.radius && d < distance) { closest = hit; distance = d; }
    }
    return closest;
  }
  function setResult(next) {
    result = next; anatomy = buildRpniAnatomy(next); snapshot = null;
    day = clamp(day, 0, finite(result?.config?.durationDays, Infinity));
    timeMs = clamp(timeMs, 0, finite(result?.config?.traceDurationMs, Infinity));
    if (!anatomy.contacts.some((contact) => idKey(contact.id) === idKey(selectedId))) selectedId = anatomy.contacts[0]?.id ?? null;
    zoom = 1; panX = 0; panY = 0;
    requestDraw();
  }
  function setTime(next, activityMs) {
    const value = typeof next === 'number' ? next : next?.day;
    day = clamp(finite(value, day), 0, finite(result?.config?.durationDays, Infinity));
    timeMs = clamp(finite(typeof next === 'object' ? next?.timeMs ?? next?.activityMs : activityMs, timeMs), 0, finite(result?.config?.traceDurationMs, Infinity));
    requestDraw();
  }
  function setOptions(next = {}) {
    const oldView = options.view;
    Object.assign(options, next);
    if (next.view === 'cross-section') options.view = 'transverse';
    if (!['longitudinal', 'transverse'].includes(options.view)) options.view = 'longitudinal';
    options.sectionFraction = clamp(finite(options.sectionFraction, .5));
    if ('selectedElectrodeId' in next) selectedId = next.selectedElectrodeId;
    else if ('selected' in next) selectedId = next.selected;
    if (oldView !== options.view) { zoom = 1; panX = 0; panY = 0; }
    requestDraw();
  }
  function resetCamera(view) {
    if (view) options.view = ['transverse', 'cross-section'].includes(view) ? 'transverse' : 'longitudinal';
    zoom = 1; panX = 0; panY = 0; requestDraw();
  }
  canvas.addEventListener('pointerdown', (event) => {
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], rect = canvas.getBoundingClientRect();
      pinch = { distance: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])), zoom, panX, panY,
        centerX: (a[0] + b[0]) / 2 - rect.left - width / 2,
        centerY: (a[1] + b[1]) / 2 - rect.top - (options.view === 'transverse' ? height * .48 : (height - 10) / 2) };
      pointerDown = null;
    } else if (pointers.size === 1) pointerDown = { x: event.clientX, y: event.clientY, panX, panY, moved: false };
    canvas.setPointerCapture?.(event.pointerId);
  }, { signal: abort.signal });
  canvas.addEventListener('pointermove', (event) => {
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()], rect = canvas.getBoundingClientRect();
      zoom = clamp(pinch.zoom * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.distance, .65, 6);
      const x = (a[0] + b[0]) / 2 - rect.left - width / 2;
      const y = (a[1] + b[1]) / 2 - rect.top - (options.view === 'transverse' ? height * .48 : (height - 10) / 2);
      panX = x - (pinch.centerX - pinch.panX) * zoom / pinch.zoom;
      panY = y - (pinch.centerY - pinch.panY) * zoom / pinch.zoom;
      requestDraw(); return;
    }
    if (pointerDown) {
      const dx = event.clientX - pointerDown.x, dy = event.clientY - pointerDown.y;
      if (Math.hypot(dx, dy) > 4) pointerDown.moved = true;
      if (pointerDown.moved) { panX = pointerDown.panX + dx; panY = pointerDown.panY + dy; requestDraw(); }
    } else {
      const rect = canvas.getBoundingClientRect(), hit = hitAt(event.clientX - rect.left, event.clientY - rect.top);
      if (hoverId !== (hit?.id ?? null)) { hoverId = hit?.id ?? null; canvas.style.cursor = hit ? 'pointer' : 'grab'; requestDraw(); }
    }
  }, { signal: abort.signal });
  canvas.addEventListener('pointerup', (event) => {
    pointers.delete(event.pointerId);
    const down = pointerDown; pointerDown = null;
    canvas.releasePointerCapture?.(event.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; return; }
    if (!down || down.moved) return;
    const rect = canvas.getBoundingClientRect(), hit = hitAt(event.clientX - rect.left, event.clientY - rect.top);
    if (hit) selectContact(hit.id);
  }, { signal: abort.signal });
  canvas.addEventListener('pointercancel', (event) => { pointers.delete(event.pointerId); pointerDown = null; pinch = null; }, { signal: abort.signal });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const before = zoom; zoom = clamp(zoom * Math.exp(-event.deltaY * .001), .65, 6);
    const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left - width / 2;
    const y = event.clientY - rect.top - (options.view === 'transverse' ? height * .48 : (height - 10) / 2);
    panX = x - (x - panX) * zoom / before; panY = y - (y - panY) * zoom / before;
    requestDraw();
  }, { signal: abort.signal, passive: false });
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Home') { event.preventDefault(); resetCamera(); return; }
    if (['+', '=', '-', '_'].includes(event.key)) {
      event.preventDefault(); zoom = clamp(zoom * (['+', '='].includes(event.key) ? 1.25 : .8), .65, 6); requestDraw(); return;
    }
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key) || !anatomy.contacts.length) return;
    event.preventDefault();
    const index = anatomy.contacts.findIndex((contact) => idKey(contact.id) === idKey(selectedId));
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    selectContact(anatomy.contacts[(index + direction + anatomy.contacts.length) % anatomy.contacts.length].id);
  }, { signal: abort.signal });
  function dispose() {
    if (disposed) return;
    disposed = true; abort.abort(); resizeObserver.disconnect();
    if (drawRequest) cancelAnimationFrame(drawRequest);
    canvas.remove();
  }
  resize();
  return { available: false, renderer: 'canvas2d', setResult, setTime, setOptions, resetCamera, resize,
    get representativeCount() { return anatomy.representativeCount; }, destroy: dispose, dispose };
}
