/** Complete dependency audit around the targeted research script.
 * Normal use runs the study. --finalize accepts an explicit during-run snapshot
 * from the initial long-running study; its timing/scope remain in provenance.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { windowAverage, biphasicAverage } from '../src/lib/cortex/experiment.js';

const ROOT = new URL('../', import.meta.url);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const entry = new URL('scripts/cortex-targeted-refinement-study.mjs', ROOT);
const target = new URL('docs/cortex/benchmarks/targeted-refinement-latest.json', ROOT);
const supplemental = new URL('docs/cortex/benchmarks/targeted-refinement-provenance.json', ROOT);

function dependencyHashes() {
  const visited = new Set(), files = {};
  function visit(url) {
    if (visited.has(url.href)) return;
    visited.add(url.href);
    const bytes = readFileSync(url);
    files[relative(fileURLToPath(ROOT), fileURLToPath(url))] = hash(bytes);
    if (url.pathname.endsWith('.json')) return;
    for (const match of bytes.toString().matchAll(/(?:\bfrom\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)) visit(new URL(match[1], url));
  }
  visit(entry);
  return files;
}
const helpers = () => ({ windowAverage: hash(windowAverage.toString()), biphasicAverage: hash(biphasicAverage.toString()) });
const finalize = process.argv.indexOf('--finalize');
let initial;
if (finalize >= 0) {
  const source = process.argv[finalize + 1];
  if (!source) throw new Error('--finalize requires the explicit prior snapshot path');
  initial = JSON.parse(readFileSync(source));
} else {
  initial = { capturedAt: new Date().toISOString(), scope: 'Full static local-import graph before study execution.',
    files: dependencyHashes(), pulseHelperHashes: helpers() };
  execFileSync(process.execPath, [fileURLToPath(entry)], { cwd: ROOT, stdio: 'inherit', env: process.env });
}
const report = JSON.parse(readFileSync(target));
if (report.status !== 'completed' || !report.sourceUnchangedDuringStudy) throw new Error('Targeted study is incomplete or its core source changed.');
const finalFiles = dependencyHashes(), finalHelpers = helpers();
if (!Object.keys(initial.files ?? {}).length || !Object.keys(finalFiles).length)
  throw new Error('An empty import snapshot cannot establish provenance.');
if (!['windowAverage', 'biphasicAverage'].every((key) => initial.pulseHelperHashes?.[key]))
  throw new Error('The pulse helper snapshot is incomplete.');
if (finalize < 0 && JSON.stringify(Object.keys(initial.files).sort()) !== JSON.stringify(Object.keys(finalFiles).sort()))
  throw new Error('The local import graph changed during the study.');
const unchanged = Object.entries(initial.files).every(([p, value]) => finalFiles[p] === value);
const helpersUnchanged = Object.entries(initial.pulseHelperHashes).every(([p, value]) => finalHelpers[p] === value);
if (!unchanged || !helpersUnchanged) throw new Error('Supplemental imported numerical inputs changed.');
const audit = { schemaVersion: 'cortex-targeted-provenance/1',
  captureMode: finalize >= 0 ? 'during-run-supplement' : 'before-run-full-graph',
  capturedAt: initial.capturedAt, verifiedAt: new Date().toISOString(), captureScope: initial.scope,
  importedFiles: finalFiles, capturedInputHashes: initial.files, pulseHelperHashes: finalHelpers,
  importedInputsUnchanged: unchanged, pulseHelpersUnchanged: helpersUnchanged,
  initialSnapshotCoverage: finalize >= 0 ? 'Core solver/model hashes were captured by the running study at start. Supplemental configuration, placement, catalog and pulse-helper hashes were captured during execution and checked at completion. The full import graph below was audited at completion.' : 'Complete local import graph captured before and checked after execution.',
  generatorSha256: hash(readFileSync(new URL(import.meta.url))),
  studyReportSha256: hash(readFileSync(target)),
  studySourceHashesMatch: Object.entries(report.sourceHashes).every(([p, value]) => finalFiles[p] === value || hash(readFileSync(new URL(p, ROOT))) === value),
  criteriaSha256: hash(readFileSync(new URL('docs/cortex/TARGETED_REFINEMENT.md', ROOT))),
  pass: unchanged && helpersUnchanged };
if (!audit.studySourceHashesMatch || audit.criteriaSha256 !== report.criteriaSha256) throw new Error('Study source or predeclared criteria hashes no longer match.');
writeFileSync(supplemental, JSON.stringify(audit, null, 2) + '\n');
console.log(`Targeted numerical dependency audit: ${Object.keys(finalFiles).length} files unchanged/audited; ${relative(fileURLToPath(ROOT), fileURLToPath(supplemental))}`);
