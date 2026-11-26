import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initial,act} from '../public/equipment/03-01/solver.mjs';
import {assets,anchors} from '../public/equipment/03-01/geometry-source.mjs';
import {build} from '../public/equipment/03-01/mesh-writer.mjs';
test('Independent 100 µm optical step shadow and normal case',()=>{const r=act(initial(),'example');assert.equal(r.result.lightShadow.shadowCells,4);assert.ok(Math.abs(r.result.lightShadow.analyticalLengthMm-.1)<1e-12);assert.equal(act(act(r,'set',{angleDeg:0}),'read').result.lightShadow.shadowCells,0);});
test('Physical fit and cover guards',()=>{assert.match(act(initial(),'seat').error,/cover/);let r=act(initial(),'example');assert.match(act(r,'cover').error,/Remove/);r=act(act(r,'set',{diameterMm:110}),'seat');assert.equal(r.seated,false);assert.match(r.error,/exceeds/);});
test('Reproducible metric GLB and target nodes',()=>{const m=build(assets,anchors),x=readFileSync(new URL('../public/equipment/03-01/bjd-1800-witness.glb',import.meta.url));assert.ok(x.equals(Buffer.from(m.raw)));assert.ok(x.length<500000);assert.equal(m.metrics.unit,'m');const j=JSON.parse(x.subarray(20,20+x.readUInt32LE(12)));for(let i=1;i<=6;i++)assert.equal(j.nodes.find(x=>x.name==='recess_'+i).extras.action,'pocket:'+i);});
