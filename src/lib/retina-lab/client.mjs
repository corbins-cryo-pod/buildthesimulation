import { createRetinalClient } from "../retinal-implant/client.mjs";
export const createClient = (options) =>
  createRetinalClient({
    workerFactory: () =>
      new Worker(new URL("./worker.mjs", import.meta.url), { type: "module" }),
    ...options,
  });
