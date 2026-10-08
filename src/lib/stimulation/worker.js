import { runExperiment } from './experiment.js';
self.onmessage = ({ data }) => {
  try {
    const result = runExperiment(data.config, progress => self.postMessage({ job: data.job, ...progress }));
    const arrays = [...Object.values(result.traces), ...Object.values(result.field), ...Object.values(result.anatomy)].filter(v => ArrayBuffer.isView(v)).map(v => v.buffer);
    self.postMessage({ job: data.job, result }, arrays);
  } catch (error) { self.postMessage({ job: data.job, error: error.message || 'The experiment could not run.' }); }
};
