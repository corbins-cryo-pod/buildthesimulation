import { createSimulation, stepSimulation, getMetrics, serializeSimulation, restoreSimulation, exportCSV, exportSWC } from './engine.js';
import {playbackStep} from './playback.js';
import {runTransmissionAssay} from './connectivity.js';

let sim = null;
let generation = 0;
let playing = false;
const yieldThread = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
const send = (extra = {}) => self.postMessage({ type: 'state', state: serializeSimulation(sim), metrics: getMetrics(sim), playing, ...extra });

async function advance(hours, token, preview = false) {
  const target = sim.timeHours + Math.max(0, hours);
  let last = performance.now();
  while (sim.timeHours < target - 1e-8 && token === generation) {
    const before = sim.timeHours;
    stepSimulation(sim, Math.min(.5, target - sim.timeHours));
    if (sim.timeHours <= before || sim.limits.reached) break;
    if (performance.now() - last > 240) {
      send({ busy: true, preview, progress: sim.timeHours / Math.max(target, 1) });
      last = performance.now();
    }
    await yieldThread();
  }
  if (token === generation) send({ busy: false, preview: false, previewComplete: preview });
}

async function play(token, speed, until) {
  while (playing && token === generation && sim.timeHours < until - 1e-8) {
    const before = sim.timeHours;
    const frame=playbackStep(sim.config.dtHours,speed,until-sim.timeHours);
    stepSimulation(sim, frame.hours);
    send({frameDuration:frame.frameDuration});
    if (sim.timeHours <= before || sim.limits.reached) break;
    await yieldThread(frame.frameDuration);
  }
  if (token === generation) { playing = false; send({ busy: false }); }
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const token = ++generation; playing = false;
      sim = createSimulation(data.config);
      send({ busy: Boolean(data.previewHours), preview: Boolean(data.previewHours) });
      if (data.previewHours) await advance(Math.min(72, data.previewHours), token, true);
    } else if (data.type === 'advance' && sim) {
      const token = ++generation; playing = false;
      send({ busy: true });
      await advance(Math.min(168 - sim.timeHours, Math.max(0, data.hours)), token);
    } else if (data.type === 'play' && sim) {
      const token = ++generation; playing = true;
      await play(token, Math.max(.005, Math.min(2, data.speed || .1)), Math.min(168, data.until || 72));
    } else if (data.type === 'pause') {
      ++generation; playing = false;
      if (sim) send({ busy: false });
    } else if (data.type === 'restore') {
      ++generation; playing = false;
      const restored = restoreSimulation(data.document);
      sim = restored;
      send({ busy: false, restored: true });
    } else if (data.type === 'transmission' && sim) {
      ++generation; playing=false;
      const options={sourceCellId:data.cellId};
      const reference=runTransmissionAssay(sim,options);
      const blocked=runTransmissionAssay(sim,{...options,transmission:false});
      self.postMessage({type:'transmission',reference,blocked});
    } else if (data.type === 'export' && sim) {
      const format = data.format;
      const content = format === 'swc' ? exportSWC(sim, data.cellId) : format === 'csv' ? exportCSV(sim) : JSON.stringify(serializeSimulation(sim), null, 2);
      self.postMessage({ type: 'export', format, content, cellId: data.cellId });
    } else if (data.type === 'compare') {
      const token = ++generation; playing = false;
      const runs = [];
      for (let index = 0; index < data.cases.length; index++) {
        const item = data.cases[index];
        const run = createSimulation(item.config);
        const until = Math.min(96, Math.max(1, data.hours || 48));
        while (run.timeHours < until - 1e-8 && token === generation) {
          const before = run.timeHours;
          stepSimulation(run, Math.min(1, until - run.timeHours));
          if (run.timeHours <= before || run.limits.reached) break;
          self.postMessage({ type: 'compare-progress', index, progress: run.timeHours / until, label: item.label });
          await yieldThread();
        }
        if (token !== generation) return;
        runs.push({ label: item.label, config: run.config, metrics: getMetrics(run), history: run.history, hours: run.timeHours, limits: run.limits });
      }
      if (token === generation) self.postMessage({ type: 'comparison', runs });
    }
  } catch (error) {
    playing = false;
    self.postMessage({ type: 'error', message: error?.message || String(error) });
  }
};
