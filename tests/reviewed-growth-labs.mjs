import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
test('reviewed growth labs have built assets and pass numerical regressions', {timeout:120000}, () => {
  for(const p of ['public/labs/neuron-growth-v3/index.html','public/labs/neurotissue-v4/index.html','public/labs/growth-review/REVIEW.md']) assert.ok(existsSync(p), `Missing ${p}; run python3 tools/build-reviewed-growth-labs.py`);
  execFileSync(process.execPath,['tests/neural-growth/verify.cjs'],{cwd:process.cwd(),stdio:'pipe'});
});
