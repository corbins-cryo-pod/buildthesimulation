import test from "node:test";
import assert from "node:assert/strict";
import {simulate,example} from "../src/lib/equipment/04-01.mjs";
import {readFileSync} from "node:fs";
const fixture={...example,durationMin:2,maskRate:0,layers:[{material:"fixture",thicknessNm:500,rateNmMin:100}]};
test("04-01 constant rate / ideal mask",()=>{const r=simulate(fixture);for(let j=0;j<r.grid.ny;j++)for(let i=0;i<r.grid.nx;i++){const x=(i+.5)*r.grid.dxUm-50;assert.ok(Math.abs(r.depthNm[j*r.grid.nx+i]-(Math.abs(x)<=10?200:0))<1e-8)}});
test("04-01 time response and breakthrough",()=>{assert.equal(simulate({...fixture,durationMin:4}).summary.centerDepthNm,400);assert.equal(simulate({...fixture,durationMin:6,layers:[{material:"A",thicknessNm:500,rateNmMin:100},{material:"B",thicknessNm:80,rateNmMin:20}]}).summary.centerDepthNm,520);assert.equal(simulate({...fixture,maskNm:50,maskRate:50}).summary.edgeDepthNm,100)});
test("04-01 example and invalid substrate",()=>{assert.equal(simulate(example).summary.centerDepthNm,50);assert.equal(simulate(example).summary.protectedMaskNm,112.5);assert.throws(()=>simulate({...example,waferMm:201}));assert.throws(()=>simulate({...example,durationMin:-1}));});
test("04-01 handoff reproducible and geometry scale",()=>{const root=new URL("../public/equipment-assets/04-01/",import.meta.url);const data=JSON.parse(readFileSync(new URL("example-result.json",root),"utf8"));assert.deepEqual(data,simulate(example));const model=JSON.parse(readFileSync(new URL("model-source.json",root),"utf8"));assert.equal(model.parts.find(p=>p.name==="wafer").size[0],.2);assert.equal(Math.abs(model.hoist.rotationDeg),90);assert.equal(new Set(model.parts.map(p=>p.name)).size,model.parts.length)});
