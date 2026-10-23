/**
 * Microfabrication laboratory: a deterministic, reduced geometric process model.
 *
 * Coordinates and all geometry are in micrometres. Grid cells describe material
 * occupancy, not display pixels. Every channel result is derived from retained
 * conductive material; the illustrations do not supply independent results.
 *
 * This is a generic polymer/metal/polymer teaching layout. Effective etch rates,
 * lithographic edge bias, and the lift-off reach envelope are inputs/assumptions,
 * not a fitted tool recipe. No fabrication yield or implanted lifetime is predicted.
 */

export const DEFAULT_CONFIG = Object.freeze({
  traceWidthUm: 12,
  siteDiameterUm: 48,
  openingDiameterUm: 36,
  pitchUm: 64,
  metalThicknessNm: 200,
  baseThicknessUm: 10,
  topThicknessUm: 10,
  resistThicknessUm: 2,
  undercutUm: 1.2,
  lithographyBiasUm: 0,
  overlayXUm: 0,
  overlayYUm: 0,
  etchTimeMin: 12,
  etchRateUmMin: 1,
  maskThicknessUm: 6,
  etchSelectivity: 3,
  lateralRatio: 0.04,
  depositionAngleDeg: 6,
  effectiveResistivityOhmM: 2.44e-8,
  defect: 'none',
});

export const STAGES = Object.freeze([
  { id: 'carrier', label: 'Carrier', station: 'Inspection', description: 'Start with a rigid carrier. The final device outline is a design overlay, not an etched feature.' },
  { id: 'base', label: 'Polymer base', station: 'Coat and cure', description: 'Add a uniform insulating polymer base. Thickness is an effective film input.' },
  { id: 'resist', label: 'Resist coating', station: 'Lithography', description: 'Coat a two-layer lift-off resist with a distinct imaging layer and underlayer.' },
  { id: 'develop', label: 'Align and develop', station: 'Mask aligner', description: 'Develop the conductor pattern. The lower resist opening includes the specified undercut.' },
  { id: 'deposit', label: 'Metal deposition', station: 'Physical deposition', description: 'Deposit metal in open regions and on top of resist. A geometric reach envelope flags possible sidewall continuity.' },
  { id: 'lift-off', label: 'Lift-off', station: 'Pattern transfer', description: 'Remove the resist and its supported metal when the modeled undercut separates the deposited films.' },
  { id: 'encapsulation', label: 'Encapsulation', station: 'Coat and cure', description: 'Cover the retained conductors with a planarized insulating polymer layer.' },
  { id: 'contact-etch', label: 'Open contacts', station: 'Patterned etch', description: 'Etch the site and pad openings with effective rates and finite mask selectivity. The remaining mask is still visible here.' },
  { id: 'outline', label: 'Define outline', station: 'Pattern and strip', description: 'Strip the remaining opening mask and ideally define the device perimeter. This outline operation is geometric.' },
  { id: 'release', label: 'Release and inspect', station: 'Metrology', description: 'Remove the carrier geometrically, then inspect the released material and its electrical connectivity.' },
].map(Object.freeze));

export const SCENARIOS = Object.freeze([
  { id: 'baseline', name: 'Reference process', description: 'Four separate traces with aligned contact openings and a surviving etch mask.', config: {} },
  { id: 'misalignment', name: 'Misaligned openings', description: 'Shift the opening mask across the metal sites; compare exposed site area with unintended trace exposure.', config: { overlayXUm: 28, overlayYUm: 10 } },
  { id: 'underetch', name: 'Incomplete opening', description: 'Stop before the polymer above the contacts is cleared. Metal continuity remains, but the contacts are covered.', config: { etchTimeMin: 6 } },
  { id: 'open', name: 'Broken conductor', description: 'A residual resist defect blocks deposition across channel 1, leaving an actual gap in its conductor.', config: { defect: 'open' } },
  { id: 'bridge', name: 'Bridged channels', description: 'An unintended lithographic opening joins channels 2 and 3 with deposited metal.', config: { defect: 'bridge' } },
  { id: 'liftoff', name: 'Failed lift-off', description: 'Insufficient undercut permits sidewall continuity in the conservative geometric envelope. The process stops with trapped resist.', config: { undercutUm: 0, depositionAngleDeg: 28, metalThicknessNm: 650 } },
  { id: 'overetch', name: 'Mask breakthrough', description: 'Consume the etch mask, then remove the polymer protecting the routing traces.', config: { maskThicknessUm: 2, etchTimeMin: 20 } },
].map((scenario) => Object.freeze({ ...scenario, config: Object.freeze(scenario.config) })));

const WIDTH_UM = 320;
const HEIGHT_UM = 1000;
const CELL_UM = 2;
const NX = WIDTH_UM / CELL_UM;
const NY = HEIGHT_UM / CELL_UM;
const SIZE = NX * NY;
const CELL_AREA = CELL_UM * CELL_UM;
const SITE_Y = 170;
const PAD_Y = 900;
const LIMITS = Object.freeze({
  traceWidthUm: [2, 48], siteDiameterUm: [8, 100], openingDiameterUm: [4, 96], pitchUm: [40, 80],
  metalThicknessNm: [20, 2000], baseThicknessUm: [1, 50], topThicknessUm: [1, 50],
  resistThicknessUm: [0.4, 10], undercutUm: [0, 8], lithographyBiasUm: [-12, 12],
  overlayXUm: [-120, 120], overlayYUm: [-180, 180], etchTimeMin: [0, 120],
  etchRateUmMin: [0.05, 10], maskThicknessUm: [0, 30], etchSelectivity: [0.2, 20],
  lateralRatio: [0, 0.5], depositionAngleDeg: [0, 60], effectiveResistivityOhmM: [1e-9, 1e-5],
});

/** Unknown keys are intentionally ignored; invalid numeric inputs use defaults. */
export function normalizeConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const result = {};
  for (const [key, fallback] of Object.entries(DEFAULT_CONFIG)) {
    if (key === 'defect') {
      result.defect = ['none', 'open', 'bridge', 'pinhole'].includes(source.defect) ? source.defect : fallback;
      continue;
    }
    const supplied = source[key];
    const value = typeof supplied === 'number' && Number.isFinite(supplied) ? supplied : fallback;
    const [lower, upper] = LIMITS[key];
    result[key] = Math.min(upper, Math.max(lower, value));
  }
  return result;
}

function newMask(value = 0) {
  const mask = new Uint8Array(SIZE);
  if (value) mask.fill(value);
  return mask;
}

function intersects(first, second) {
  for (const value of first) if (second.has(value)) return true;
  return false;
}

function maskAnd(a, b) {
  const mask = newMask();
  for (let i = 0; i < SIZE; i += 1) mask[i] = a[i] && b[i] ? 1 : 0;
  return mask;
}

function inverse(mask, bounds) {
  const result = newMask();
  for (let i = 0; i < SIZE; i += 1) result[i] = !mask[i] && (!bounds || bounds[i]) ? 1 : 0;
  return result;
}

function clip(mask, bounds) {
  for (let i = 0; i < SIZE; i += 1) if (!bounds[i]) mask[i] = 0;
  return mask;
}

function count(mask) {
  let sum = 0;
  for (let i = 0; i < SIZE; i += 1) sum += mask[i];
  return sum;
}

function diskContains(x, y, cx, cy, radius) {
  return radius > 0 && (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
}

function rectContains(x, y, cx, cy, halfWidth, halfHeight) {
  return halfWidth > 0 && halfHeight > 0 && Math.abs(x - cx) <= halfWidth && Math.abs(y - cy) <= halfHeight;
}

function centers(config) {
  return Array.from({ length: 4 }, (_, i) => WIDTH_UM / 2 + (i - 1.5) * config.pitchUm);
}

function makeBody() {
  const body = newMask();
  for (let iy = 0; iy < NY; iy += 1) {
    const y = (iy + 0.5) * CELL_UM;
    const halfWidth = y < 120 ? 136 * Math.max(0, (y - 12) / 108) : 136;
    for (let ix = 0; ix < NX; ix += 1) {
      const x = (ix + 0.5) * CELL_UM;
      body[iy * NX + ix] = y >= 12 && y <= 976 && Math.abs(x - 160) <= halfWidth ? 1 : 0;
    }
  }
  return body;
}

function conductorContains(x, y, cx, config, bias) {
  return diskContains(x, y, cx, SITE_Y, config.siteDiameterUm / 2 + bias)
    || rectContains(x, y, cx, (SITE_Y + PAD_Y) / 2, config.traceWidthUm / 2 + bias, (PAD_Y - SITE_Y) / 2 + bias)
    || rectContains(x, y, cx, PAD_Y, 22 + bias, 36 + bias);
}

function pattern(config, bias = 0, defect = 'none', undercut = 0) {
  const mask = newMask();
  const xs = centers(config);
  for (let iy = 0; iy < NY; iy += 1) {
    const y = (iy + 0.5) * CELL_UM;
    for (let ix = 0; ix < NX; ix += 1) {
      const x = (ix + 0.5) * CELL_UM;
      let on = xs.some((cx) => conductorContains(x, y, cx, config, bias));
      if (defect === 'open' && Math.abs(x - xs[0]) < config.pitchUm * 0.45 && Math.abs(y - 528) <= Math.max(0, 8 - undercut)) on = false;
      if (defect === 'bridge' && x >= xs[1] - undercut && x <= xs[2] + undercut && Math.abs(y - 560) <= 4 + undercut) on = true;
      mask[iy * NX + ix] = on ? 1 : 0;
    }
  }
  return mask;
}

function openingPattern(config, lateral = 0, includeDefect = true, nominal = false) {
  const mask = newMask();
  const xs = centers(config);
  const bias = nominal ? 0 : config.lithographyBiasUm;
  const shiftX = nominal ? 0 : config.overlayXUm;
  const shiftY = nominal ? 0 : config.overlayYUm;
  for (let iy = 0; iy < NY; iy += 1) {
    const y = (iy + 0.5) * CELL_UM;
    for (let ix = 0; ix < NX; ix += 1) {
      const x = (ix + 0.5) * CELL_UM;
      let on = xs.some((cx) => diskContains(x, y, cx + shiftX, SITE_Y + shiftY, config.openingDiameterUm / 2 + bias + lateral)
        || rectContains(x, y, cx + shiftX, PAD_Y + shiftY, 18 + bias + lateral, 28 + bias + lateral));
      // A defect in the contact-opening mask makes an unintended via over a trace.
      if (includeDefect && config.defect === 'pinhole' && diskContains(x, y, xs[3], 620, 7 + lateral)) on = true;
      mask[iy * NX + ix] = on ? 1 : 0;
    }
  }
  return mask;
}

/** Four-neighbour conductive components; corner contact is not an electrical via. */
export function labelConnectedComponents(mask, nx = NX, ny = NY) {
  const length = nx * ny;
  if (!(mask instanceof Uint8Array) || mask.length !== length) throw new TypeError('Connectivity requires one Uint8Array cell per grid location.');
  const labels = new Int32Array(length);
  const queue = new Int32Array(length);
  let componentCount = 0;
  for (let start = 0; start < length; start += 1) {
    if (!mask[start] || labels[start]) continue;
    componentCount += 1;
    let head = 0;
    let tail = 1;
    queue[0] = start;
    labels[start] = componentCount;
    while (head < tail) {
      const index = queue[head++];
      const x = index % nx;
      const visit = (next) => {
        if (mask[next] && !labels[next]) { labels[next] = componentCount; queue[tail++] = next; }
      };
      if (x > 0) visit(index - 1);
      if (x + 1 < nx) visit(index + 1);
      if (index >= nx) visit(index - nx);
      if (index + nx < length) visit(index + nx);
    }
  }
  return { labels, componentCount };
}

function channelResults(config, metal, exposed, stage, labels, traceWidthsUm) {
  const xs = centers(config);
  const memberships = xs.map(() => ({ pad: new Set(), site: new Set(), all: new Set(), nominalCells: 0, exposedCells: 0, openingCells: 0, intendedExposedCells: 0 }));
  for (let iy = 0; iy < NY; iy += 1) {
    const y = (iy + 0.5) * CELL_UM;
    for (let ix = 0; ix < NX; ix += 1) {
      const index = iy * NX + ix;
      const x = (ix + 0.5) * CELL_UM;
      for (let channel = 0; channel < 4; channel += 1) {
        const cx = xs[channel];
        const info = memberships[channel];
        const onSite = diskContains(x, y, cx, SITE_Y, config.siteDiameterUm / 2);
        if (onSite) {
          info.nominalCells += 1;
          if (exposed[index]) info.exposedCells += 1;
          if (labels[index]) info.site.add(labels[index]);
        }
        if (diskContains(x, y, cx, SITE_Y, config.openingDiameterUm / 2)) {
          info.openingCells += 1;
          if (exposed[index]) info.intendedExposedCells += 1;
        }
        if (labels[index] && rectContains(x, y, cx, PAD_Y, 22, 36)) info.pad.add(labels[index]);
        if (labels[index] && conductorContains(x, y, cx, config, 0)) info.all.add(labels[index]);
      }
    }
  }
  return memberships.map((info, channel) => {
    const connected = stage >= 4 && intersects(info.pad, info.site);
    const shortedWith = memberships.flatMap((other, j) => j !== channel && intersects(info.all, other.all) ? [j + 1] : []);
    const exposedAreaUm2 = info.exposedCells * CELL_AREA;
    const nominalAreaUm2 = info.nominalCells * CELL_AREA;
    const intendedOpeningAreaUm2 = info.openingCells * CELL_AREA;
    const actualTraceWidthUm = traceWidthsUm[channel];
    const resistanceOhm = connected && !shortedWith.length && actualTraceWidthUm > 0
      ? config.effectiveResistivityOhmM * ((PAD_Y - SITE_Y) * 1e-6) / (actualTraceWidthUm * 1e-6 * config.metalThicknessNm * 1e-9)
      : null;
    let status = stage < 4 ? 'not-fabricated' : !connected ? 'open' : shortedWith.length ? 'shorted' : exposedAreaUm2 === 0 ? 'covered' : 'connected';
    // Connectivity and site accessibility remain separate even for shorted nets.
    if (shortedWith.length) status = 'shorted';
    return {
      id: channel + 1, xUm: xs[channel], siteYUm: SITE_Y, padYUm: PAD_Y,
      nominalAreaUm2, intendedOpeningAreaUm2, exposedAreaUm2,
      exposureFraction: nominalAreaUm2 ? exposedAreaUm2 / nominalAreaUm2 : 0,
      apertureCoverageFraction: info.openingCells ? info.intendedExposedCells / info.openingCells : 0,
      actualTraceWidthUm, connected, shortedWith, resistanceOhm, status,
    };
  });
}

function addLayer(layers, id, name, material, color, zUm, thicknessUm, mask, extra = {}) {
  if (thicknessUm <= 1e-9 || !count(mask)) return;
  layers.push({ id, name, material, color, zUm, thicknessUm, mask, ...extra });
}

/** Produce a complete frame. The caller may mutate returned arrays without changing future runs. */
export function createExperiment(input = {}, requestedStage = 9) {
  const config = normalizeConfig(input);
  const stage = Number.isFinite(requestedStage) ? Math.max(0, Math.min(9, Math.floor(requestedStage))) : 9;
  const metalThicknessUm = config.metalThicknessNm / 1000;
  const full = newMask(1);
  const body = makeBody();
  const designMetal = pattern(config);
  const lithographyOpening = pattern(config, config.lithographyBiasUm, config.defect);
  const lowerOpening = pattern(config, config.lithographyBiasUm + config.undercutUm, config.defect, config.undercutUm);
  const lateralReachUm = config.resistThicknessUm * Math.tan(config.depositionAngleDeg * Math.PI / 180) + metalThicknessUm;
  const liftOffMarginUm = config.undercutUm - lateralReachUm;
  const sidewallContinuous = liftOffMarginUm <= 0;
  const liftOffBlocked = stage >= 5 && sidewallContinuous;
  const effectiveStage = liftOffBlocked ? 5 : stage;
  const outlined = effectiveStage >= 8;
  const footprint = outlined ? body : full;
  const baseMetal = effectiveStage >= 4 ? clip(lithographyOpening.slice(), footprint) : newMask();
  const metal = baseMetal.slice();
  // Projection is valid for this single-metal-layer teaching layout. If the
  // sidewall envelope closes, the over-resist film joins every adjacent opening.
  if (effectiveStage >= 4 && sidewallContinuous) metal.set(footprint);

  const etching = effectiveStage >= 7;
  const capPresent = effectiveStage >= 6;
  const etchDepthUm = etching ? config.etchTimeMin * config.etchRateUmMin : 0;
  const maskLifetimeMin = config.maskThicknessUm * config.etchSelectivity / config.etchRateUmMin;
  const protectedEtchDepthUm = etching ? Math.max(0, config.etchTimeMin - maskLifetimeMin) * config.etchRateUmMin : 0;
  const maskRemainingUm = etching ? Math.max(0, config.maskThicknessUm - etchDepthUm / config.etchSelectivity) : config.maskThicknessUm;
  const capRemainingUm = capPresent ? Math.max(0, config.topThicknessUm - etchDepthUm) : 0;
  const protectedCapRemainingUm = capPresent ? Math.max(0, config.topThicknessUm - protectedEtchDepthUm) : 0;
  const lateralEtchUm = etching ? etchDepthUm * config.lateralRatio : 0;
  const maskOpenings = openingPattern(config, 0);
  const etchRegion = etching ? openingPattern(config, lateralEtchUm) : newMask();
  const openings = newMask();
  const exposed = newMask();
  for (let i = 0; i < SIZE; i += 1) {
    if (!footprint[i]) continue;
    if (capPresent) {
      const remaining = etchRegion[i] ? capRemainingUm : protectedCapRemainingUm;
      if (etching && remaining <= 1e-9) openings[i] = 1;
      if (openings[i] && baseMetal[i]) exposed[i] = 1;
    } else if (effectiveStage >= 4) {
      // The underlying patterned metal is accessible before encapsulation.
      exposed[i] = baseMetal[i];
    }
  }

  const layers = [];
  if (effectiveStage < 9) addLayer(layers, 'carrier', 'Silicon carrier', 'silicon', '#65717c', -40, 40, full, { illustrativeThickness: true });

  // The etch treats metal as an ideal stop. Exposed polymer outside metal can
  // recess through the cap, its planarizing fill, and then into the base.
  const baseGroups = new Map();
  const capGroups = new Map();
  const fillGroups = new Map();
  let minimumBaseThicknessUm = effectiveStage >= 1 ? config.baseThicknessUm : 0;
  const appendGroup = (groups, thickness, index) => {
    const rounded = Math.round(thickness * 1e9) / 1e9;
    if (rounded <= 0) return;
    if (!groups.has(rounded)) groups.set(rounded, newMask());
    groups.get(rounded)[index] = 1;
  };
  if (effectiveStage >= 1) {
    for (let i = 0; i < SIZE; i += 1) {
      if (!footprint[i]) continue;
      const depth = etching ? (etchRegion[i] ? etchDepthUm : protectedEtchDepthUm) : 0;
      const baseLoss = capPresent && !baseMetal[i] ? Math.max(0, depth - config.topThicknessUm - metalThicknessUm) : 0;
      const remainingBase = Math.max(0, config.baseThicknessUm - baseLoss);
      minimumBaseThicknessUm = Math.min(minimumBaseThicknessUm, remainingBase);
      appendGroup(baseGroups, remainingBase, i);
      if (capPresent) {
        appendGroup(capGroups, Math.max(0, config.topThicknessUm - depth), i);
        if (!baseMetal[i]) appendGroup(fillGroups, Math.max(0, metalThicknessUm - Math.max(0, depth - config.topThicknessUm)), i);
      }
    }
    let index = 0;
    for (const [thickness, mask] of [...baseGroups.entries()].sort((a, b) => b[0] - a[0])) {
      addLayer(layers, index ? `base-recess-${index}` : 'base', index ? 'Recessed polymer base' : 'Polymer base', 'polyimide', '#a9bfca', 0, thickness, mask);
      index += 1;
    }
  }

  const resistPresent = effectiveStage === 2 || effectiveStage === 3 || effectiveStage === 4 || liftOffBlocked;
  if (resistPresent) {
    const underlayerThickness = config.resistThicknessUm * 0.35;
    const lowerMask = effectiveStage === 2 ? full.slice() : inverse(lowerOpening, footprint);
    const upperMask = effectiveStage === 2 ? full.slice() : inverse(lithographyOpening, footprint);
    addLayer(layers, 'resist-underlayer', 'Lift-off underlayer', 'resist', '#ac7853', config.baseThicknessUm, underlayerThickness, lowerMask);
    addLayer(layers, 'resist-imaging', 'Imaging resist', 'resist', '#cd9d70', config.baseThicknessUm + underlayerThickness, config.resistThicknessUm - underlayerThickness, upperMask);
  }

  if (effectiveStage >= 4) {
    addLayer(layers, 'metal', 'Patterned conductor', 'gold', '#d6b356', config.baseThicknessUm, metalThicknessUm, baseMetal);
    if (resistPresent) {
      addLayer(layers, 'metal-on-resist', 'Metal supported by resist', 'gold', '#d6b356', config.baseThicknessUm + config.resistThicknessUm, metalThicknessUm, inverse(lithographyOpening, footprint));
      if (sidewallContinuous) {
        const wall = newMask();
        for (let iy = 1; iy < NY - 1; iy += 1) {
          for (let ix = 1; ix < NX - 1; ix += 1) {
            const i = iy * NX + ix;
            if (lithographyOpening[i] && (!lithographyOpening[i - 1] || !lithographyOpening[i + 1] || !lithographyOpening[i - NX] || !lithographyOpening[i + NX])) wall[i] = 1;
          }
        }
        addLayer(layers, 'metal-sidewall', 'Sidewall continuity envelope', 'gold', '#d6b356', config.baseThicknessUm, config.resistThicknessUm, wall, { illustrativeWidth: true, physicalWidthUm: metalThicknessUm });
      }
    }
  }

  let groupIndex = 0;
  for (const [thickness, mask] of fillGroups) {
    addLayer(layers, groupIndex ? `cap-fill-${groupIndex}` : 'cap-fill', 'Polymer planarizing fill', 'polyimide', '#8aa8a2', config.baseThicknessUm, thickness, mask);
    groupIndex += 1;
  }
  groupIndex = 0;
  for (const [thickness, mask] of [...capGroups.entries()].sort((a, b) => b[0] - a[0])) {
    addLayer(layers, groupIndex ? `encapsulation-recess-${groupIndex}` : 'encapsulation', groupIndex ? 'Partly etched encapsulation' : 'Polymer encapsulation', 'polyimide', '#8aa8a2', config.baseThicknessUm + metalThicknessUm, thickness, mask);
    groupIndex += 1;
  }
  if (effectiveStage === 7 && maskRemainingUm > 0) addLayer(layers, 'etch-mask', 'Remaining patterned etch mask', 'etch-mask', '#b194ac', config.baseThicknessUm + metalThicknessUm + config.topThicknessUm, maskRemainingUm, inverse(maskOpenings, footprint));

  const { labels, componentCount } = labelConnectedComponents(metal);
  // Width is measured on an intact central trace segment of the actual lattice.
  const row = Math.floor(400 / CELL_UM);
  const xs = centers(config);
  const traceWidthsUm = xs.map((cx) => {
    let actualWidthCells = 0;
    for (let ix = 0; ix < NX; ix += 1) {
      if (Math.abs((ix + 0.5) * CELL_UM - cx) < config.pitchUm / 2 && baseMetal[row * NX + ix]) actualWidthCells += 1;
    }
    return effectiveStage >= 4 ? actualWidthCells * CELL_UM : Math.max(0, config.traceWidthUm + 2 * config.lithographyBiasUm);
  });
  const actualTraceWidthUm = traceWidthsUm[0];
  const channels = channelResults(config, metal, exposed, effectiveStage, labels, traceWidthsUm);
  const intendedOpenings = openingPattern(config, 0, false, true);
  // Site and pad regions, rather than tiny rasterization fringes around the nominal
  // aperture, define unintended exposure. An enlarged opening still inside a metal
  // site is not mislabeled as a routing defect.
  let unintendedExposedCells = 0;
  let allExposedCells = 0;
  for (let iy = 0; iy < NY; iy += 1) {
    const y = (iy + 0.5) * CELL_UM;
    for (let ix = 0; ix < NX; ix += 1) {
      const i = iy * NX + ix;
      if (!exposed[i]) continue;
      allExposedCells += 1;
      const x = (ix + 0.5) * CELL_UM;
      const intendedRegion = xs.some((cx) => diskContains(x, y, cx, SITE_Y, config.siteDiameterUm / 2) || rectContains(x, y, cx, PAD_Y, 22, 36));
      if (!intendedRegion) unintendedExposedCells += 1;
    }
  }
  const connectedCount = channels.filter((channel) => channel.connected).length;
  const openCount = effectiveStage >= 4 ? channels.filter((channel) => !channel.connected).length : 0;
  const shortCount = channels.filter((channel) => channel.shortedWith.length).length;
  const totalThicknessUm = layers.filter((layer) => layer.id !== 'carrier' && layer.id !== 'etch-mask').reduce((maximum, layer) => Math.max(maximum, layer.zUm + layer.thicknessUm), 0);
  const warnings = [];
  const warn = (id, title, detail, severity = 'warning') => warnings.push({ id, title, detail, severity });

  if (liftOffBlocked) warn('lift-off-blocked', 'Process stopped at lift-off', `The ${lateralReachUm.toFixed(2)} µm geometric deposition reach exceeds the ${config.undercutUm.toFixed(2)} µm undercut. The conservative model retains sidewall-connected overlayer and trapped resist; encapsulation and release have not occurred. This is an envelope assumption, not an experimentally calibrated success criterion.`, 'error');
  else if (effectiveStage === 4 && sidewallContinuous) warn('sidewall-continuity', 'Possible sidewall continuity', 'The deposition envelope connects metal on the resist to the patterned conductor. The next lift-off step will stop in this conservative geometry model.', 'error');
  if (openCount) warn('open-circuit', `${openCount} open channel${openCount === 1 ? '' : 's'}`, 'No connected retained-metal path joins the intended site to its own pad. This result is obtained by four-neighbour connectivity on the material grid.', 'error');
  if (shortCount) warn('short-circuit', `${shortCount} channels share conductive material`, 'At least one retained-metal component intersects more than one intended channel. Resistance is suppressed for these shorts.', 'error');
  if (etching && capRemainingUm > 1e-9) warn('underetch', 'Contact polymer remains', `${capRemainingUm.toFixed(2)} µm of encapsulation remains in the etched openings. A continuous conductor is not yet an exposed electrode.`, 'error');
  if (etching && maskRemainingUm <= 1e-9) warn('mask-exhausted', 'Etch mask consumed', `The mask lasts ${maskLifetimeMin.toFixed(2)} min under the assumed selectivity. Protected regions receive ${protectedEtchDepthUm.toFixed(2)} µm of additional polymer etch after breakthrough.`, protectedEtchDepthUm > 0 ? 'error' : 'warning');
  if (etching && unintendedExposedCells) warn('unintended-exposure', 'Routing metal is exposed', `${(unintendedExposedCells * CELL_AREA).toFixed(0)} µm² of exposed conductor lies outside the intended site and pad regions.`, 'error');
  if (etching && (config.overlayXUm || config.overlayYUm)) warn('overlay', 'Opening mask is displaced', `The contact-opening mask is translated by ${config.overlayXUm.toFixed(1)} µm horizontally and ${config.overlayYUm.toFixed(1)} µm longitudinally. Areas are intersections with the actual retained site metal.`, 'info');
  if (outlined && count(maskAnd(designMetal, inverse(body)))) warn('outline-clips-design', 'Design extends beyond the perimeter', 'The outline operation removes metal outside the device body; inspect the end-to-end connections and reduced sites.', 'warning');
  if (etching && minimumBaseThicknessUm < config.baseThicknessUm) warn('base-recession', 'Exposed base polymer is recessed', 'Away from metal etch stops, the simplified vertical etch continues through encapsulation and into the base. The visible recession follows the same local material state.', 'warning');
  if (config.traceWidthUm + 2 * config.lithographyBiasUm <= 0) warn('trace-erased', 'Lithographic bias removes the trace', 'The effective developed trace width is zero or negative. The conductor sites and pads may remain as disconnected islands.', 'error');

  return {
    config, stage,
    geometry: { widthUm: WIDTH_UM, heightUm: HEIGHT_UM, cellUm: CELL_UM, nx: NX, ny: NY, body, designMetal, metal, openings, exposed, maskOpenings, intendedOpenings },
    layers, channels,
    measurements: {
      connectedCount, isolatedConnectedCount: channels.filter((channel) => channel.connected && !channel.shortedWith.length).length,
      openCount, shortCount, exposedAreaUm2: channels.reduce((sum, channel) => sum + channel.exposedAreaUm2, 0),
      allExposedMetalAreaUm2: allExposedCells * CELL_AREA, unintendedExposedAreaUm2: unintendedExposedCells * CELL_AREA,
      totalThicknessUm, maskRemainingUm, capRemainingUm, protectedCapRemainingUm,
      actualTraceWidthUm, minimumBaseThicknessUm, componentCount,
    },
    warnings,
    process: {
      effectiveStage, blocked: liftOffBlocked, liftOffMarginUm, lateralReachUm, sidewallContinuous,
      maskLifetimeMin, etchDepthUm, protectedEtchDepthUm, lateralEtchUm,
      resistanceModel: 'Uniform center-to-center trace estimate; measured lattice width, specified effective resistivity, no contact/spreading resistance.',
      assumptions: [
        'Generic four-site teaching layout; not a replica of a manufactured implant.',
        '2 µm lateral lattice; subcell features and edge profiles are not resolved.',
        'Effective lithographic edge bias and etch rates are specified, not inferred from tool power or exposure dose.',
        'Lift-off uses a conservative angular-reach envelope; sidewall film width is visually exaggerated to one lattice cell.',
        'Planarized polymer deposition and perfectly selective metal etch stops; no plasma chemistry or metal damage model.',
        'Outline and release are ideal geometric operations; adhesion, release chemistry, stress, and implant lifetime are not predicted.',
        'Illustrative bulk-gold resistivity is the default; real thin-film resistance requires measured effective resistivity.',
      ],
    },
  };
}
