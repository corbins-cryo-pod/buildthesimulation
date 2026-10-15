// Camera and scale calculations only. No geometry is stretched to improve visibility.
export const MODEL_FOV = 34;
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => a.map(v => v / Math.hypot(...a));
const middle = bounds => bounds.min.map((v, i) => (v + bounds.max[i]) / 2);
const boxAt = (center, size) => ({ min: center.map((v, i) => v - size[i] / 2), max: center.map((v, i) => v + size[i] / 2) });

export function boundsCorners(bounds) {
  return [0, 1].flatMap(x => [0, 1].flatMap(y => [0, 1].map(z => [bounds[x ? 'max' : 'min'][0], bounds[y ? 'max' : 'min'][1], bounds[z ? 'max' : 'min'][2]])));
}

// Fit the projected corners, including depth. The diagonal alone wastes most of
// the viewport on thin films and clips long models in end-on views.
export function fitModelView(bounds, direction, up, aspect = 1, padding = 1.18) {
  direction = unit(direction); up = unit(up);
  if (Math.abs(dot(direction, up)) > 0.98) up = [0, 1, 0];
  const right = unit(cross(up, direction));
  const screenUp = unit(cross(direction, right));
  const target = middle(bounds), tanV = Math.tan(MODEL_FOV * Math.PI / 360), tanH = tanV * Math.max(aspect, 0.1);
  const distance = Math.max(...boundsCorners(bounds).map(point => {
    const offset = sub(point, target);
    return dot(offset, direction) + Math.max(Math.abs(dot(offset, right)) / tanH, Math.abs(dot(offset, screenUp)) / tanV) * padding;
  }), 0.001);
  return { target, direction, up, distance };
}

export function defaultModelView(model) {
  if (['neuropixels', 'planar-probe'].includes(model.kind)) return 'tip';
  if (model.kind === 'carbon-row') return 'distal';
  if (model.kind === 'exposed-wire') return 'junction';
  if (model.kind === 'cylindrical-lead' && model.length / model.diameter > 25) return 'contact-window';
  if (model.kind === 'surface-grid' && model.length / model.width > 16) return 'detail';
  return 'oblique';
}

export function modelView(model, fullBounds, sites, requested = 'default', aspect = 1) {
  const next = requested === 'default' ? defaultModelView(model) : requested;
  let bounds = { min: [...fullBounds.min], max: [...fullBounds.max] };
  let direction = [0.8, -1.3, 1], up = [0, 0, 1], label = 'Overview', detail = false;
  const surface = ['surface-grid', 'chip-envelope', 'neuralink'].includes(model.kind);
  if (surface) { direction = [0.35, -0.75, 1.65]; up = [0, 1, 0]; }
  if (model.kind === 'neuralink') direction = [0.25, 0.75, 1.65];
  if (model.kind === 'stentrode') direction = [1, -0.55, 0.27];
  if (model.kind === 'flat-cuff') direction = [0.1, -0.18, 1.3];
  if (model.kind === 'nerve-cuff') direction = [0.12, -0.15, 1.2];
  if (['cylindrical-lead', 'exposed-wire'].includes(model.kind)) direction = [1, -1.6, 0.22];
  if (next === 'front') { direction = surface ? [0, 0, 1] : [0, -1, 0]; label = surface ? 'Contact face' : 'Front'; }
  if (next === 'side') { direction = surface ? [1, -0.2, 0.25] : [1, -0.2, 0]; label = surface ? 'Low angle' : 'Side'; }
  if (next === 'end') { direction = [0, 0, 1]; up = [0, 1, 0]; label = 'End-on'; }
  if (next === 'cutaway') { direction = [0.6, -1.5, 0.85]; label = 'Shell cutaway'; }

  if (['neuropixels', 'planar-probe'].includes(model.kind)) {
    // The electrode-bearing tip is at +length, not the shank base at zero.
    if (['tip', 'front', 'side'].includes(next)) {
      const tipWindow = Math.min(model.length, Math.max((model.firstSiteFromTip ?? model.tipLength ?? 0.2) + 0.48, (bounds.max[0] - bounds.min[0]) * 1.35));
      bounds.min[2] = model.length - tipWindow; bounds.max[2] = model.length;
      direction = next === 'side' ? [1, -0.3, 0.1] : [0.1, -1, 0.12];
      label = next === 'side' ? 'Tip · thickness view' : 'Distal tips'; detail = true;
    }
    if (next === 'detail') {
      const site = sites.reduce((best, current) => current.positionMm[2] > best.positionMm[2] ? current : best, sites[0]);
      const pitch = model.rowPitch ?? 0.02, span = Math.max(model.width * 1.8, pitch * 9, 0.15);
      bounds = boxAt(site.positionMm, [Math.max(model.width * 1.4, span * 0.5), model.thickness, span]);
      direction = [0.05, -1, 0.08]; label = 'Recording sites · one shank'; detail = true;
    }
    if (next === 'oblique') { direction = [0.08, -1, 0.08]; label = 'Full shank'; }
  }

  if (next === 'detail' && model.kind === 'surface-grid') {
    // Use a center-nearest contact, avoiding the row edge returned by array[n/2].
    const site = sites.reduce((best, current) => Math.hypot(...current.positionMm) < Math.hypot(...best.positionMm) ? current : best, sites[0]);
    const rowPitch = model.rowPitch ?? model.pitch, colPitch = model.columnPitch ?? model.pitch;
    bounds = boxAt(site.positionMm, [Math.min(model.width, Math.max(model.siteSize * 5, colPitch * 3.5)), Math.min(model.length, Math.max(model.siteSize * 5, rowPitch * 3.5)), model.thickness]);
    direction = [0.15, -0.35, 1.6]; label = 'Recording sites'; detail = true;
  }
  if (next === 'detail' && model.kind === 'carbon-row') {
    bounds = boxAt(sites[Math.floor(sites.length / 2)].positionMm, [model.diameter * 6, model.diameter * 6, model.diameter * 6]);
    direction = [0.2, -0.45, 1.2]; label = 'Cut fiber face'; detail = true;
  }
  if (next === 'distal' && model.kind === 'carbon-row') {
    bounds.min[2] = model.length - (bounds.max[0] - bounds.min[0]) * 0.65;
    direction = [0.2, -1, 0.5]; label = 'Distal fiber row'; detail = true;
  }
  if (next === 'contact-window' && model.kind === 'cylindrical-lead') {
    const first = model.contacts[0], last = model.contacts[Math.min(2, model.contacts.length - 1)];
    bounds.min[2] = first.z - first.length / 2;
    bounds.max[2] = last.z + last.length / 2;
    label = 'Distal contact window'; detail = true;
  }
  if (next === 'junction' && model.kind === 'exposed-wire') {
    bounds = boxAt([0, 0, model.exposedStart ?? model.length - model.exposedLength], [model.diameter * 2, model.diameter * 2, model.diameter * 10]);
    label = 'Insulation boundary'; detail = true;
  }
  if (next === 'detail' && model.kind === 'connexus') {
    bounds = boxAt([0, 0, model.length - model.tipLength / 2], [model.pitch * 4, model.pitch * 4, model.tipLength * 3]);
    direction = [0.8, -1.3, 1.5]; label = 'Microwire tips'; detail = true;
  }
  if (next === 'detail' && model.kind === 'stentrode') {
    const site = sites[Math.floor(sites.length / 2)];
    bounds = boxAt(site.positionMm, [model.electrodeDiameter * 3.5, model.electrodeDiameter * 3.5, model.electrodeDiameter * 3.5]);
    direction = add(site.normal, [0, 0, 0.15]); label = 'Stent contact'; detail = true;
  }
  if (['thread', 'detail'].includes(next) && model.kind === 'neuralink') {
    const site = sites[model.sitesPerThread * Math.floor(model.threadCount / 2) + Math.floor(model.sitesPerThread / 2)];
    const span = next === 'thread' ? model.sitePitch * model.sitesPerThread * 1.2 : model.sitePitch * 1.6;
    bounds = boxAt(site.positionMm, [next === 'thread' ? model.fanPitch * 6 : model.fanPitch * 1.5, span, model.threadThickness]);
    direction = [0.1, -0.15, 1.5]; label = next === 'thread' ? 'Thread contact rows' : 'Thread contact'; detail = true;
  }
  if (next === 'detail' && ['cylindrical-lead', 'nerve-cuff', 'flat-cuff', 'exposed-wire'].includes(model.kind)) {
    const site = sites[Math.floor(sites.length / 2)];
    const size = model.kind === 'flat-cuff' ? model.contacts[0].diameter * 3.5 : model.kind === 'exposed-wire' ? model.diameter * 6 : Math.max(model.diameter ?? model.innerDiameter, model.contacts[0].length) * 1.6;
    bounds = boxAt(site.positionMm, [size, size, model.kind === 'exposed-wire' ? Math.min(model.exposedLength, size * 2) : size]);
    direction = site.normal ?? [0.8, -1, 0.25]; label = model.kind === 'exposed-wire' ? 'Exposed wire surface' : 'Contact surface'; detail = true;
  }
  return { ...fitModelView(bounds, direction, up, aspect), bounds, view: next, label, detail, cutaway: next === 'detail' && ['nerve-cuff', 'flat-cuff'].includes(model.kind) };
}

export function niceLength(maximum) {
  const power = 10 ** Math.floor(Math.log10(Math.max(maximum, 1e-12))), scaled = maximum / power;
  return (scaled >= 5 ? 5 : scaled >= 2 ? 2 : 1) * power;
}

export function formatModelLength(mm) {
  return mm < 1 ? `${Number((mm * 1000).toPrecision(4))} µm` : `${Number(mm.toPrecision(4))} mm`;
}

export function modelScaleBar(distance, viewportHeight, maximumPixels = 112) {
  const mmPerPixel = 2 * distance * Math.tan(MODEL_FOV * Math.PI / 360) / Math.max(viewportHeight, 1);
  const mm = niceLength(mmPerPixel * maximumPixels);
  return { mm, pixels: mm / mmPerPixel, label: formatModelLength(mm) };
}
