export function createPrimaClient({ workerFactory = () => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' }) } = {}) {
  let worker = null, active = null, sequence = 0, disposed = false;
  function abort() {
    if (!active) return;
    const error = new Error('PRIMA calculation cancelled.'); error.name = 'AbortError';
    active.reject(error); active = null;
  }
  function ensureWorker() {
    if (worker) return;
    const instance = workerFactory();
    worker = instance;
    instance.onmessage = ({ data }) => {
      if (worker !== instance || !active || data.id !== active.id) return;
      if (data.type === 'progress') active.onProgress(data.progress);
      else if (data.type === 'result') { const task = active; active = null; task.resolve(data.result); }
      else if (data.type === 'error') { const task = active; active = null; task.reject(new Error(data.message)); }
    };
    instance.onerror = event => {
      if (worker !== instance) return;
      if (active) { active.reject(new Error(event.message || 'Calculation worker failed.')); active = null; }
      instance.terminate(); worker = null;
    };
  }
  return {
    run(config, options = {}) {
      if (disposed) return Promise.reject(new Error('PRIMA client is disposed.'));
      if (active) { abort(); worker?.terminate(); worker = null; }
      ensureWorker();
      const onProgress = typeof options === 'function' ? options : options.onProgress || (() => {});
      return new Promise((resolve, reject) => { active = { id: ++sequence, resolve, reject, onProgress }; worker.postMessage({ type: 'run', id: active.id, config }); });
    },
    cancel() { if (!active) return; abort(); worker?.terminate(); worker = null; },
    dispose() { disposed = true; abort(); worker?.terminate(); worker = null; },
  };
}

