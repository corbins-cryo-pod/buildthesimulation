// Bounded diagnostic search, not a threshold or convergence study. Uses the
// unmodified active cable and the actual Interface Laboratory placements.
import fs from 'node:fs/promises';
import { makeInterfaceCells, freshInterfaceConfig, loadInterfaceModels, interfacePulse } from '../src/lib/cortex/interface-experiment.js';
import { createInterfaceField } from '../src/lib/cortex/interface-field.js';
import { createActiveCable, stepActiveCable } from '../src/lib/cortex/active-cable.js';
import { getActiveModel } from '../src/lib/cortex/model-library.js';

const config = { ...freshInterfaceConfig(), count: 12, mode: 'evoked', durationMs: 30, startMs: 5 };
await loadInterfaceModels(config, path => fs.readFile(new URL(`../public${path}`, import.meta.url)));
const cells = makeInterfaceCells(config), field = createInterfaceField();
for (const specimen of [601927090, 541536216, 529807751]) {
  const cell = cells.find(cell => cell.specimenId === specimen), model = getActiveModel(cell.id);
  const contact = field.contacts.slice().sort((a, b) =>
    Math.hypot(...a.centerUm.map((v, i) => v - cell.somaUm[i])) - Math.hypot(...b.centerUm.map((v, i) => v - cell.somaUm[i])))[0];
  const coeff = field.prepare(cell.nodes.map(n => n.centerUm)).coefficients;
  const conditioned = createActiveCable(cell.nodes, model.fit, { kv2TauGuard: model.kv2TauGuard !== false });
  for (let s = 0; s < config.settleMs / config.dtMs; s++) stepActiveCable(conditioned, config.dtMs);
  console.log(JSON.stringify({ specimen, somaUm: cell.somaUm, contact: contact.index, nodes: cell.nodes.length }));
  let found = false;
  for (const phaseUs of [200, 500, 1000]) {
    for (const amplitudeUa of [0, 5, 10, 20, 40, 60, 100]) {
      const c = structuredClone(conditioned), ve = new Float64Array(c.n), run = { ...config, phaseUs, amplitudeUa };
      const events = []; let peakMv = -Infinity, last = -Infinity;
      try {
        for (let s = 0; s < config.durationMs / config.dtMs; s++) {
          const time = s * config.dtMs, amp = interfacePulse(run, time + config.dtMs / 2);
          for (let i = 0; i < c.n; i++) ve[i] = coeff[i * 8 + contact.index] * amp;
          const previous = c.voltageMv[cell.somaIndex];
          stepActiveCable(c, config.dtMs, { extracellularMv: ve });
          const v = c.voltageMv[cell.somaIndex]; peakMv = Math.max(peakMv, v);
          if (previous < -25 && v >= -25 && time - last > 2) { last = time; events.push({ timeMs: time, peakMv: v, repolarized: false }); }
          for (const e of events) {
            if (time - e.timeMs < 3) e.peakMv = Math.max(e.peakMv, v);
            if (time - e.timeMs < 20 && v < -40) e.repolarized = true;
          }
        }
        const complete = events.filter(e => e.peakMv >= 0 && e.repolarized);
        console.log(JSON.stringify({ specimen, contact: contact.index, phaseUs, amplitudeUa, peakMv, events, completeCount: complete.length }));
        if (amplitudeUa > 0 && complete.length) { found = true; break; }
      } catch (error) {
        console.log(JSON.stringify({ specimen, contact: contact.index, phaseUs, amplitudeUa, error: error.message, peakMv }));
        // Higher currents at this pulse width are not tested past a support failure.
        break;
      }
    }
    if (found) break;
  }
}
