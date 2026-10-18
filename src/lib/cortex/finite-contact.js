import manifest from '../../../workbench/cortex-finite-contact-field/artifacts/disk-v1/field.json' with { type: 'json' };
import { loadFieldPackage, STATUS_NAMES } from '../../../workbench/cortex-finite-contact-field/js/field-sampler.js';
import { freshActiveConfig } from './config.js';
import { makeActiveMorphology } from './active-morphology.js';

export const FINITE_MODEL = 'cortex-finite-disk/1';
export const FIELD_SHA256 = manifest.data.sha256;
export const DISK_CENTER_UM = Object.freeze([0, 0, 1000]);
let pending;
export function loadFiniteContact(readAsset) {
  if (readAsset) return Promise.resolve(readAsset('/models/cortex/finite-contact/disk-v1/field.bin')).then(b => loadFieldPackage(manifest, b));
  return pending ??= fetch('/models/cortex/finite-contact/disk-v1/field.bin').then(r => {
    if (!r.ok) throw new Error(`Finite disk field could not load (${r.status}).`);
    return r.arrayBuffer();
  }).then(b => loadFieldPackage(manifest, b)).catch(e => { pending = null; throw e; });
}
export function localPoint(point, center = DISK_CENTER_UM) {
  return point.map((v, i) => (v - center[i]) * 1e-6);
}
export function finiteTransfer(field, point, center = DISK_CENTER_UM) {
  const sample = field.sampleUnitPotential(new Float64Array(localPoint(point, center)));
  return sample.status[0] === 0 ? sample.values[0] * 1e-3 : null;
}
// Conservative capsule bounds: each complete polyline segment plus maximum
// membrane radius must fit inside the convex validated cylinder. Requiring
// z-radius >= 25 also preserves the disk-distance guard and avoids the rim.
// This deliberately excludes some safe lateral placements; it cannot admit
// a segment that crosses the insulating plane between valid endpoints.
export function prepareFiniteNodes(field, nodes, config, center = DISK_CENTER_UM) {
  if (field.manifest.data.sha256 !== FIELD_SHA256 || config.tissue.conductivitySPerM !== 0.3 || config.protocol.mode !== 'extracellular-stimulation')
    throw new Error('Finite disk requires the pinned 0.3 S/m field and extracellular stimulation.');
  if (!Array.isArray(center) || center.length !== 3 || center.some(v => !Number.isFinite(v))) throw new Error('Invalid disk center.');
  const issues = [];
  for (const node of nodes) {
    const radius = Math.max(node.diameterUm ?? 0, ...(node.pathDiameterUm ?? [])) / 2;
    const points = [node.centerUm, node.startUm, node.endUm, ...(node.pathUm ?? [])];
    let reason;
    for (const p of points) {
      const [x,y,z] = p.map((v,i) => v-center[i]);
      if (![x,y,z,radius].every(Number.isFinite)) reason = 'Nonfinite morphology';
      else if (z-radius <= 0) reason = 'Membrane crosses the insulating plane';
      else if (z-radius < config.recording.exclusionUm) reason = 'Conservative 25 µm plane/contact guardrail';
      else if (Math.hypot(x,y)+radius > 250 || z+radius > 250) reason = 'Whole membrane extends beyond validated field coverage';
      if (reason) break;
    }
    if (reason) issues.push({id:node.id, reason});
  }
  const coordinates = new Float64Array(nodes.flatMap(n => localPoint(n.centerUm, center)));
  const sample = field.sampleUnitPotential(coordinates);
  sample.status.forEach((s,i) => { if (s) issues.push({id:nodes[i].id,reason:STATUS_NAMES[s]}); });
  return {supported:issues.length===0, issues, unitFieldMv:Float64Array.from(sample.values,v=>v*1e-3),
    metadata:{model:FINITE_MODEL, packageSha256:FIELD_SHA256, centerUm:[...center], normal:[0,0,1],
      conductivitySPerM:0.3, radiusUm:25, validatedRadiusUm:250, validatedHeightUm:250,
      return:'Grounded cylinder radius and height 50 mm; distant return approximation',
      gauge:'Outer cylinder = 0 V', recording:'unsupported', electricField:'unsupported',
      guardrail:'Whole polyline capsules: at least 25 µm above insulating plane; no clipping or fallback',
      potentialUnits:'mV/µA', basis:'disk_to_outer_ground'}};
}
export function finiteCellConfig(modelId, length = 40, offset = [0,0,0]) {
  const c = freshActiveConfig();
  c.neuron.modelId=modelId; c.membrane.sourceModelId=modelId;
  c.neuron.segmentLengthUm=length; c.neuron.somaUm=[0,0,0];
  c.protocol.mode='extracellular-stimulation'; c.protocol.startMs=5;
  c.protocol.amplitudeUa=1; c.solver.durationMs=20;
  const nodes=makeActiveMorphology(c).nodes;
  const points=nodes.flatMap(n=>[n.centerUm,...n.pathUm]);
  const lo=[0,1,2].map(i=>Math.min(...points.map(p=>p[i])));
  const hi=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
  c.neuron.somaUm=lo.map((v,i)=>DISK_CENTER_UM[i]+(i===2?137.5:0)-(v+hi[i])/2+offset[i]);
  return c;
}
