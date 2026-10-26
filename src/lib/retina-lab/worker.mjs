import { loadPerceptReference } from "../retinal-implant/percept.mjs";
import { simulate } from "./engine.mjs";
let reference;
self.onmessage = async ({ data }) => {
  if (data.type !== "run") return;
  try {
    reference ??= await loadPerceptReference();
    const result = await simulate(data.config, reference, {
      timeMs: data.timeMs ?? 0,
      onProgress: (progress) =>
        self.postMessage({ type: "progress", id: data.id, progress }),
    });
    self.postMessage({ type: "result", id: data.id, result });
  } catch (error) {
    self.postMessage({ type: "error", id: data.id, message: error.message });
  }
};
