import { routeDesign } from './routing.js';
import { checkDesign } from './checks.js';
self.onmessage = ({ data }) => {
  try {
    const result = routeDesign(data.contacts, data.routing, progress => self.postMessage({ job:data.job, progress }));
    const checks = checkDesign(data.contacts, data.routing, result);
    self.postMessage({ job:data.job, result, checks });
  } catch(error) { self.postMessage({ job:data.job, error:error.message }); }
};
