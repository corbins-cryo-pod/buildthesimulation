/** Run after the source, preamp and scope files are available; optionally specify checkout file paths. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {initial,dispatch} from '../../../public/equipment/09-10/solver.mjs';
const gen=JSON.parse(readFileSync(process.argv[2]??'public/equipment/09-06/example-waveform.json','utf8'));
const scope=await import(pathToFileURL(resolve(process.argv[3]??'public/equipment/09-04/solver.mjs')));
const start=dispatch(initial(),'import',gen);assert.equal(start.ok,true,start.message);
const params=dispatch(start.state,'set',{source:'A',gain:2});assert.equal(params.ok,true,params.message);
const pre=dispatch(params.state,'capture');assert.equal(pre.ok,true,pre.message);
const settings={source:'import',level:0,voltsDiv:.25,centerV:0,rate:256000,secDiv:.0005};
const got=scope.acquire(settings,scope.jsonSource(pre.result));
assert.ok(Math.abs(pre.result.summary.outputVpp-2)<1e-9);
assert.ok(Math.abs(got.measurements.peakToPeakV-2)<.002);
assert.ok(Math.abs(got.measurements.periodS-.001)<2e-6);
assert.equal(got.measurements.clipCount,0);
console.log(JSON.stringify({classification:'Simulated wire-format handoff executed through the three actual simulator implementations; not hardware data.',generatorVpp:gen.channels[0].metrics.sampledVpp,preampVpp:pre.result.summary.outputVpp,preampParent:pre.result.parent,scopeSettings:settings,scope:got.measurements},null,2));
