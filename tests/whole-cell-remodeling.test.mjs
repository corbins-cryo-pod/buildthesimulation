import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Script } from 'node:vm';
import { createRequire } from 'node:module';
import { simulationLinks } from '../src/data/simulations.js';
const repo=fileURLToPath(new URL('../',import.meta.url));
const base=path.join(repo,'workbench/whole-cell-remodeling');
const output=path.join(repo,'public/simulations/whole-cell-remodeling/index.html');
const read=p=>readFileSync(p,'utf8');
const html=read(output);
const hashes={'engine.js':'1dc693a20ca535a09a2c5c2b67f9e3d3c6789fa65e26904900d5714c4a1a316c','renderer.js':'0ca36918f919d284ab2046365f0a8044360ac3eaa9ef31f4bbae382035746be3'};
test('whole-cell engine and renderer preserve the recovered numerical prototype',()=>{
 for(const [name,sha] of Object.entries(hashes)) {
  const bytes=readFileSync(path.join(base,'src',name));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);
  assert.doesNotThrow(()=>new Script(bytes.toString(),{filename:name}));
 }
 for(const name of ['app.js','import.js'])assert.doesNotThrow(()=>new Script(read(path.join(base,'src',name))));
});
test('public page exactly matches explicit media-free sources',()=>{
 let expected=read(path.join(base,'src/template.html'));
 for(const [key,name] of [['__ENGINE__','engine.js'],['__RENDERER__','renderer.js'],['__IMPORT__','import.js'],['__APP__','app.js']])expected=expected.replace(key,read(path.join(base,'src',name)));
 assert.equal(html,expected);
 assert.doesNotMatch(html,/data:video|<video\b|reference\.mp4|referenceToggle|referenceVideo|Compare recording|__REFERENCE|Recording 2026/i);
 assert.doesNotMatch(html,/__[A-Z_]+__/);
 assert.match(html,/href="\/simulations\/"/);
 assert.match(html,/not a calibrated biological prediction/);
 assert.match(html,/Software verification.*does not establish biological validity/);
});
test('published source tree contains no archives, movies or inherited screenshots',()=>{
 const entries=readdirSync(base,{recursive:true,withFileTypes:true}).filter(d=>d.isFile());
 assert.ok(entries.length>=12);
 for(const e of entries)assert.doesNotMatch(e.name,/\.(zip|mp4|mov|webm|png|jpe?g)$/i);
 assert.deepEqual(readdirSync(path.dirname(output)),['index.html']);
});
test('catalog exposes a distinct lab and retains both existing simulations',()=>{
 for(const slug of ['whole-cell-remodeling','cell-growth','soft-neural-generator'])assert.equal(simulationLinks.filter(s=>s.href===`/simulations/${slug}/`).length,1);
 assert.match(read(path.join(repo,'src/lib/discovery-index.js')),/Whole-Cell Remodeling Laboratory/);
});
test('all original 22 numerical checks pass without changing criteria',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'whole-cell-check-'));
 try {
  const reportPath=path.join(dir,'numerical.json');
  execFileSync(process.execPath,[path.join(base,'tests/engine.test.js')],{cwd:repo,env:{...process.env,WHOLE_CELL_REPORT:reportPath},timeout:120000});
  const report=JSON.parse(read(reportPath));
  assert.equal(report.tests,22);assert.equal(report.passed,22);assert.equal(report.failed,0);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test('import boundary rejects valid JSON with malformed shapes before replacing state',()=>{
 const require=createRequire(import.meta.url);
 const {Simulation}=require(path.join(base,'src/engine.js'));
 const {restore}=require(path.join(base,'src/import.js'));
 const live=new Simulation(2646);live.advance(5);
 const before=JSON.stringify(live.exportState());
 for(const mutate of [s=>s.events=[null],s=>s.somaFilopodia[0]=null,s=>s.neurites[0].filopodia[0]=null,s=>s.history[0].lengths=[null],s=>s.time='1',s=>s.osc.armed=null,s=>delete s.params.noise,s=>s.dt=1e-100]){
  const data=JSON.parse(before);mutate(data);assert.throws(()=>restore(data));assert.equal(JSON.stringify(live.exportState()),before);
 }
 const restored=restore(JSON.parse(before));live.advance(2);restored.advance(2);assert.deepEqual(restored.exportState(),live.exportState());
 for(const name of readdirSync(path.join(base,'examples'))){const data=JSON.parse(read(path.join(base,'examples',name)));if(data.schema)assert.doesNotThrow(()=>restore(data));}
});
