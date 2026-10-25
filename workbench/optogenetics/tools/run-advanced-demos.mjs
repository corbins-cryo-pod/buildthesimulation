import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const demoIds=['chloride','chloride-high','chloride-fixed','microled','population','heat-control','chronos','chrimsonr'];
if(process.argv.length===2){for(const id of demoIds){const r=spawnSync(process.execPath,[process.argv[1],id],{stdio:'inherit',timeout:120000});if(r.status!==0)throw Error('Demo failed: '+id);}const all=demoIds.map(id=>JSON.parse(fs.readFileSync(new URL(`../validation/phase3/demo-${id}.json`,import.meta.url))));fs.writeFileSync(new URL('../validation/phase3/demonstrations.json',import.meta.url),JSON.stringify(all,null,2));process.exit(0);}
import {preset} from '../src/advanced/config.js';
import {runAdvanced} from '../src/advanced/engine.js';
const model=JSON.parse(fs.readFileSync(new URL('../data/cell-data.json',import.meta.url))),reports=[];
for(const id of (process.argv.length>2?process.argv.slice(2):['chloride','chloride-high','chloride-fixed','microled','population','heat-control','chronos','chrimsonr'])){
 const config=preset(id);fs.writeFileSync(new URL(`../examples/phase3/${id}.json`,import.meta.url),JSON.stringify({schema:config.schema,modelId:model.id,sourceCommit:model.sourceCommit,config},null,2));
 const r=runAdvanced(model,config);const report={id,config,summaries:r.summaries,spikes:r.cells.map(c=>c.spikes),thermal:r.thermal?.diagnostics,neuronDiagnostics:r.cells.map(c=>c.diagnostics),computationMs:r.diagnostics.computationMs};reports.push(report);fs.writeFileSync(new URL(`../validation/phase3/demo-${id}.json`,import.meta.url),JSON.stringify(report,null,2));
 fs.writeFileSync(new URL('../validation/phase3/demonstrations.json',import.meta.url),JSON.stringify(reports,null,2));console.log(id,JSON.stringify({summaries:r.summaries,heat:r.thermal?.diagnostics.maximumC,time:r.diagnostics.computationMs}));
}
