import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compare,createStation,targets} from '../public/equipment/03-02/maps.mjs';
const get=n=>fs.readFileSync(new URL('../public/equipment/03-02/'+n,import.meta.url));
test('immutable fixed coupon coordinates mirror and average to independent arithmetic',()=>{
 const a=compare(),{L,R}=a.coupons;
 assert.deepEqual(L.matrixNm,[[74,79,83],[77,82,86],[74,79,83]]);assert.deepEqual(R.matrixNm,[[83,79,74],[86,82,77],[83,79,74]]);
 assert.deepEqual(L.xMm,R.xMm.map(x=>-x).reverse());assert.equal(a.comparison.maxMirrorDeltaNm,0);
 assert.ok(Math.abs(L.summary.meanNm-717/9)<1e-12);assert.ok(Math.abs(L.summary.halfRangeOverMeanPercent-7.531380753138)<1e-12);
 L.matrixNm[0][0]=999;L.xMm[0]=500;assert.equal(compare().coupons.L.matrixNm[0][0],74);assert.equal(compare().coupons.L.xMm[0],-70);
});
test('blank has zero increment everywhere and no normalized spread',()=>{
 const b=compare('baseline');assert.equal(b.comparison.maxMirrorDeltaNm,0);
 for(const x of Object.values(b.coupons)){assert.ok(x.matrixNm.flat().every(v=>v===0));assert.equal(x.summary.halfRangeOverMeanPercent,null);}
 assert.throws(()=>compare('operating'),/Unknown/);
});
test('named visibility/focus actions do not change the delivered synthetic fixture',()=>{
 const s=createStation();assert.equal(s.hit('Bell_jar').cutaway,true);
 assert.equal(s.hit('Coupon_R').focus,'R');assert.equal(s.read().view,'snapshot');
 assert.equal(s.dispatch('load','baseline').loaded,true);
 assert.ok(s.dispatch('load','wrong').error);assert.equal(s.read().view,'baseline');
 assert.equal(s.dispatch('reset').loaded,false);
 const gb=get('auto-306-display.glb'),j=JSON.parse(gb.subarray(20,20+gb.readUInt32LE(12))),m=JSON.parse(get('vr-station.json'));
 assert.equal(gb.length,m.bytes);assert.deepEqual(j.nodes.find(x=>x.name==='Deck_880x595').scale,[.88,.018,.595]);
 assert.ok(j.nodes.find(x=>x.name==='Sloped_control_fascia').rotation[0]>0);
 for(const h of m.hitTargets){assert.ok(j.nodes.some(n=>n.name===h.node));assert.deepEqual(targets[h.node].filter(Boolean),[h.action,h.actionPayload].filter(Boolean));}
 assert.ok(JSON.parse(get('verification.json')).checks.every(c=>c.pass));
});
