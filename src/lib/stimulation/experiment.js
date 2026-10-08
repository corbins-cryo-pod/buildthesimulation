import { normalizeConfig, simulationDuration } from './config.js';
import { contactArea, contactNodes, conductivityTensor, contactField, accessMatrix, distanceToContact, interfaceStep, fieldAt } from './field.js';
import { createPopulation, samplePopulation, createMorphology } from './anatomy.js';
import { compileCable, stepCable } from './membrane.js';

export function pulseAverage(t, dt, c) {
  const width = c.phaseWidth / 1000, gap = c.gap / 1000;
  const overlap = (a, b) => Math.max(0, Math.min(t + dt, b) - Math.max(t, a));
  let value = 0;
  for (let i = 0; i < c.pulses; i++) { const start = 1 + i * 1000 / c.frequency; value += overlap(start, start + width) - overlap(start + width + gap, start + width * (1 + c.recoveryRatio) + gap) / c.recoveryRatio; }
  return value / dt;
}

export function fieldSlice(c, contacts, currents, n = 96, y = 0) {
  const sigma = conductivityTensor(c), potential = new Float32Array(n * n), magnitude = new Float32Array(n * n), currentDensity = new Float32Array(n * n);
  let peakPotential = 0, peakField = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const point = [(i / (n - 1) - .5) * c.width, y, c.top + j / (n - 1) * c.depth], index = j * n + i;
    if (c.electrodes.some(e => distanceToContact(point, e) < 2)) { potential[index] = NaN; magnitude[index] = NaN; currentDensity[index] = NaN; continue; }
    const f = fieldAt(point, contacts, currents, sigma);
    potential[index] = f.potential; magnitude[index] = f.magnitude; currentDensity[index] = Math.hypot(...f.field.map((v, k) => v * sigma[k]));
    peakPotential = Math.max(peakPotential, Math.abs(f.potential)); peakField = Math.max(peakField, f.magnitude);
  }
  return { n, y, potential, magnitude, currentDensity, peakPotential, peakField };
}

function inspectClearance(morph, electrodes) {
  let intersection = false, nearest = Infinity;
  for (const e of electrodes) {
    if (distanceToContact(morph.cell.position, e) < morph.cell.radius + 2) intersection = true;
    for (const node of morph.nodes) {
      const parent = node.parent < 0 ? node : morph.nodes[node.parent], length = Math.hypot(...node.position.map((v, k) => v - parent.position[k])), samples = Math.max(1, Math.ceil(length / 4));
      for (let k = 0; k <= samples; k++) {
        const point = node.position.map((v, axis) => parent.position[axis] + (v - parent.position[axis]) * k / samples), distance = distanceToContact(point, e);
        if (distance < node.diameter / 2 + 2) intersection = true;
        if (e.weight !== 0) nearest = Math.min(nearest, distance);
      }
    }
  }
  return { intersection, nearest };
}

export function runExperiment(input, report = () => {}) {
  const started = Date.now(), c = normalizeConfig(input), contacts = c.electrodes.map(e => contactNodes(e, c.quadrature)), sigma = conductivityTensor(c);
  if (c.electrodes.every(e => e.weight === 0)) throw new Error('Give at least one contact a nonzero current weight. Set pulse amplitude to zero for a resting-tissue control.');
  report({ progress: .02, label: 'Placing the anatomical population' });
  const population = createPopulation(c), sample = samplePopulation(population, c.sampleCount, c.seed), morphologies = [], rejected = [];
  for (const cell of sample) {
    const morph = createMorphology(cell, c);
    const clearance = inspectClearance(morph, c.electrodes);
    morph.nearest = clearance.nearest;
    if (clearance.intersection) rejected.push(cell.id); else morphologies.push(morph);
  }
  if (!morphologies.length) throw new Error('Every sampled cell intersects a contact. Move or shrink the electrodes.');
  report({ progress: .12, label: 'Integrating finite contact fields along each neuron' });
  const extracellular = morphologies.flatMap(m => m.nodes.map(node => contacts.reduce((sum, contact, j) => sum + c.electrodes[j].weight * contactField(node.position, contact, sigma), 0)));
  const cable = compileCable(morphologies, c, extracellular), matrix = accessMatrix(contacts, sigma), count = morphologies.length;
  const state = { firstSpike: new Float64Array(count).fill(-1), somaSpike: new Float64Array(count).fill(-1), axonSpike: new Float64Array(count).fill(-1), firstNode: new Int32Array(count).fill(-1), extreme: new Uint8Array(count) };
  const duration = simulationDuration(c), steps = Math.ceil(duration / c.dt), stride = Math.max(1, Math.round(.025 / c.dt)), frames = Math.floor(steps / stride) + 1;
  const time = new Float32Array(frames), soma = new Float32Array(frames * count), ais = new Float32Array(frames * count), current = new Float32Array(frames * contacts.length), voltage = new Float32Array(frames * contacts.length), etaTrace = new Float32Array(frames * contacts.length);
  const polarization = contacts.map(() => 0), charge = contacts.map(() => ({ leading: Array(c.pulses).fill(0), recovery: Array(c.pulses).fill(0), net: 0, maxVoltage: 0, maxPolarization: 0, maxCurrent: 0 }));
  let clippedSteps = 0, onSteps = 0, peakDrive = 0, frame = 0;
  for (let step = 0; step <= steps; step++) {
    const t = step * c.dt, drive = c.amplitude * pulseAverage(t, c.dt, c), requested = c.electrodes.map(e => e.weight * drive);
    const oldPolarization = step % stride === 0 ? polarization.slice() : null;
    const iface = interfaceStep(polarization, requested, contacts, matrix, c.dt, c.compliance, c.interfaceEnabled);
    const actualDrive = drive * iface.scale;
    if (Math.abs(drive) > 1e-10) { onSteps++; if (iface.scale < .99999) clippedSteps++; }
    if (drive > 0) peakDrive = Math.max(peakDrive, actualDrive);
    const pulse = Math.max(0, Math.min(c.pulses - 1, Math.floor((t - 1 + 1e-8) / (1000 / c.frequency))));
    iface.delivered.forEach((i, j) => {
      // µA × ms = nC. Retain the actual delivered imbalance after compliance clipping.
      const q = i * c.dt; charge[j].net += q;
      if (drive > 0) charge[j].leading[pulse] += q; else if (drive < 0) charge[j].recovery[pulse] += q;
      charge[j].maxVoltage = Math.max(charge[j].maxVoltage, Math.abs(iface.terminal[j]), Math.abs(iface.initialTerminal[j])); charge[j].maxPolarization = Math.max(charge[j].maxPolarization, Math.abs(polarization[j])); charge[j].maxCurrent = Math.max(charge[j].maxCurrent, Math.abs(i));
    });
    if (step % stride === 0) {
      time[frame] = t;
      for (let i = 0; i < count; i++) { soma[frame * count + i] = cable.voltage[cable.root[i]]; ais[frame * count + i] = cable.voltage[cable.ais[i]]; }
      for (let j = 0; j < contacts.length; j++) { current[frame * contacts.length + j] = iface.delivered[j]; voltage[frame * contacts.length + j] = iface.initialTerminal[j]; etaTrace[frame * contacts.length + j] = oldPolarization[j]; }
      frame++;
    }
    if (step < steps) stepCable(cable, actualDrive, t + c.dt, state);
    if (step % 100 === 0) report({ progress: .22 + .65 * step / steps, label: `Solving ${count.toLocaleString()} neurons · ${t.toFixed(1)} / ${duration.toFixed(1)} ms` });
  }
  report({ progress: .9, label: 'Mapping the field and measuring recruitment' });
  const sampled = morphologies.map((m, i) => ({ ...m.cell, firstSpike: state.firstSpike[i], firstNode: state.firstNode[i], firstKind: state.firstNode[i] < 0 ? '' : m.nodes[state.firstNode[i]].kind, somaSpike: state.somaSpike[i], axonSpike: state.axonSpike[i], extreme: !!state.extreme[i], compartments: m.nodes.length, somaDistance: Math.min(...c.electrodes.filter(e => e.weight !== 0).map(e => distanceToContact(m.cell.position, e))), neuriteDistance: m.nearest }));
  const bins = Array.from({ length: 8 }, (_, i) => ({ lower: i * 75, upper: (i + 1) * 75, total: 0, activated: 0 }));
  for (const cell of sampled) { const bin = bins[Math.min(bins.length - 1, Math.floor(cell.somaDistance / 75))]; bin.total++; if (cell.firstSpike >= 0) bin.activated++; }
  const active = sampled.filter(n => n.firstSpike >= 0), distances = active.map(n => n.somaDistance).sort((a, b) => a - b);
  const anatomy = { positions: new Float32Array(population.cells.length * 3), radii: new Float32Array(population.cells.length * 3) };
  population.cells.forEach((cell, i) => { anatomy.positions.set(cell.position, i * 3); anatomy.radii.set(cell.radii, i * 3); });
  const summary = { activated: active.length, solved: count, represented: population.cells.length, rejected: rejected.length, axonal: sampled.filter(n => n.axonSpike >= 0).length, somatic: sampled.filter(n => n.somaSpike >= 0).length, firstAxonal: active.filter(n => ['ais', 'axon'].includes(n.firstKind)).length, extreme: sampled.filter(n => n.extreme).length, medianDistance: distances[Math.floor(distances.length / 2)] ?? 0, p90Distance: distances[Math.floor((distances.length - 1) * .9)] ?? 0, clippedFraction: onSteps ? clippedSteps / onSteps : 0, netWeight: c.electrodes.reduce((s, e) => s + e.weight, 0), compartmentCount: cable.length, runtimeMs: Date.now() - started };
  return { version: c.version, config: c, anatomy, population: { count: population.cells.length, target: population.target, meanDiameter: population.meanDiameter, inhibitoryFraction: population.inhibitoryFraction, volume: population.volume, density: population.density, nearestMedian: population.nearestMedian, characteristicSpacing: population.characteristicSpacing }, samples: sampled, rejected, summary, bins, traces: { time, soma, ais, current, voltage, polarization: etaTrace, count, electrodes: contacts.length }, interfaces: charge.map((q, i) => ({ ...q, area: contactArea(c.electrodes[i]), phaseCharge: Math.max(...q.leading.map(Math.abs), ...q.recovery.map(Math.abs)), chargeDensity: Math.max(...q.leading.map(Math.abs), ...q.recovery.map(Math.abs)) / contactArea(c.electrodes[i]) * 100 })), field: fieldSlice(c, contacts, c.electrodes.map(e => e.weight * peakDrive)), peakDrive };
}
