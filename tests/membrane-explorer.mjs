import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectMechanism,sodiumEquilibrium,stepGates,mechanisms} from '../src/lib/cortex/membrane-explorer.js';
import {channelRates,sodiumMatrix} from '../src/lib/cortex/active-channels.js';
test('membrane explorer uses finite bounded equilibrium for all nine mechanisms',()=>{
 for(let i=0;i<mechanisms.length;i++)for(let v=-120;v<=60;v+=2){const s=inspectMechanism(i,v);assert.ok(Number.isFinite(s.open)&&s.open>=0&&s.open<=1);for(const g of s.gates){assert.ok(g.tau>0&&Number.isFinite(g.tau));assert.ok(g.inf>=0&&g.inf<=1);}}
});
test('NaV equilibrium is normalized and stationary under the actual transition generator',()=>{
 for(const v of [-120,-80,-40,0,60]){const s=sodiumEquilibrium(v),a=sodiumMatrix(v,null);assert.ok(Math.abs(s.reduce((a,b)=>a+b,0)-1)<1e-12);for(let i=0;i<12;i++){let r=0;for(let j=0;j<12;j++)r+=a[i*12+j]*s[j];assert.ok(Math.abs(r)<1e-9);}}
});
test('voltage step starts at holding equilibrium and tends to clamp equilibrium',()=>{
 for(let i=1;i<9;i++){const hold=inspectMechanism(i,-80),step=inspectMechanism(i,0);stepGates(i,-80,0,1e-4,0).forEach((g,j)=>assert.ok(Math.abs(g.value-hold.gates[j].inf)<1e-14));stepGates(i,-80,0,1e-4,1e7).forEach((g,j)=>assert.ok(Math.abs(g.value-step.gates[j].inf)<1e-14));}
 assert.equal(inspectMechanism(8,-65,1e-4).gates[0].inf,channelRates(-65,1e-4)[11][0]);
});
// retrigger preview build
