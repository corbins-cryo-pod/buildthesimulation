import fs from 'node:fs';
import crypto from 'node:crypto';

const walk = directory => fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry =>
  entry.isDirectory() ? walk(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);
export const fileHash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// Capture the inputs before computation. A completed run may not acquire the
// identity of source edited while it was running, or of a different retained run.
export function beginStudy(extraPaths) {
  const files = [...new Set([
    ...walk('src/lib/axon-interface').filter(p => /\.(mjs|json)$/.test(p)),
    ...walk('public/simulations/biohybrid-axon-interface/stage2/modules'),
    'scripts/axon-interface/stage2/study-provenance.mjs', ...extraPaths,
  ])].sort();
  const sourceHashes = Object.fromEntries(files.map(p => [p, fileHash(p)]));
  return {
    sourceHashes,
    finish() {
      const changed = files.filter(p => fileHash(p) !== sourceHashes[p]);
      if (changed.length) throw new Error(`Study source changed during execution: ${changed.join(', ')}`);
      return {sourceHashes, sourceChangedDuringRun:[], recordedAt:new Date().toISOString()};
    },
  };
}
