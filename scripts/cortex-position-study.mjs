// Offline only: ideal point sources at explicit positions, outside device UI.
import { pathToFileURL } from 'node:url';
import { createActiveCable, stepActiveCable } from '../src/lib/cortex/active-cable.js';
import { activeModelData } from '../src/lib/cortex/active-morphology.js';
import { biphasicAverage } from '../src/lib/cortex/experiment.js';
import { pointTransferUvPerNa, membraneDistanceUm } from '../src/lib/cortex/volume-conductor.js';
import { positionReferenceCases } from './cortex-position-reference-input.mjs';

export function runPositionStudy() {
  const results = [];
  let conditioned;
  const fields = ['voltageMv', 'previous', 'membraneCurrentNa', 'ionicNa', 'potassiumNa',
    'calciumNa', 'hcnNa', 'leakNa', 'capacitiveNa', 'gates', 'sodium', 'calciumMm'];
  for (const input of positionReferenceCases()) {
    const {nodes, config: c} = input, dt = c.solver.dtMs;
    const sources = input.stimulatingSites.map(s => s.positionUm);
    const clearancesUm = sources.map(s => Math.min(...nodes.filter(n => n.areaUm2)
      .map(n => membraneDistanceUm(s, n))));
    if (Math.min(...clearancesUm) < c.recording.exclusionUm) throw new Error('Source violates exclusion distance.');
    const cable = createActiveCable(nodes, activeModelData.fit);
    if (conditioned) for (const field of fields) cable[field].set(conditioned[field]);
    else {
      for (let k = 0; k < Math.round(c.solver.settleMs/dt); k++) stepActiveCable(cable, dt);
      conditioned = Object.fromEntries(fields.map(f => [f, cable[f].slice()]));
    }
    const unit = Float64Array.from(nodes, n =>
      pointTransferUvPerNa(n.centerUm, sources[0], c.tissue.conductivitySPerM) -
      pointTransferUvPerNa(n.centerUm, sources[1], c.tissue.conductivitySPerM));
    const ve = new Float64Array(nodes.length), somaVoltageMv = [cable.voltageMv[0]], spikes = [];
    let peakSomaMv = cable.voltageMv[0], maxConservationResidualNa = 0;
    for (let k = 0; k < Math.round(c.solver.durationMs/dt); k++) {
      const t = k*dt, drive = c.protocol.amplitudeUa*biphasicAverage(t, dt, c.protocol);
      for (let i = 0; i < nodes.length; i++) ve[i] = unit[i]*drive;
      stepActiveCable(cable, dt, {extracellularMv: ve});
      if (cable.previous[0] < -25 && cable.voltageMv[0] >= -25) {
        const time = t+dt*(-25-cable.previous[0])/(cable.voltageMv[0]-cable.previous[0]);
        if (!spikes.length || time-spikes.at(-1) >= 2) spikes.push(time);
      }
      peakSomaMv = Math.max(peakSomaMv, cable.voltageMv[0]);
      maxConservationResidualNa = Math.max(maxConservationResidualNa,
        Math.abs(cable.membraneCurrentNa.reduce((a,b) => a+b, 0)));
      if ((k+1)%Math.round(c.solver.sampleMs/dt) === 0) somaVoltageMv.push(cable.voltageMv[0]);
    }
    results.push({id: input.id, config: c, stimulatingSites: input.stimulatingSites,
      clearancesUm, peakSomaMv, somaVoltageMv, spikeTimesMs: spikes, maxConservationResidualNa});
  }
  return results;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(runPositionStudy()));
