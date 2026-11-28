'use strict';
const m=require('../src/engine.js'),assert=require('node:assert/strict'),test=require('node:test');
const p=(opts={})=>m.solve({stage:7,mode:'passive',inspect:137,location:137,...opts});
const o=(opts={})=>m.solve({stage:7,mode:'oect',...opts});
test('published geometries stay separate',()=>{
 const sg=m.modes.passive.geometry,tg=m.modes.oect.geometry;
 assert.deepEqual([sg.sites,sg.siteUm,sg.pitchUm,sg.finishedFilmUm],[256,10,30,4]);
 assert.deepEqual([tg.transistors,tg.passiveCompanionElectrodes,tg.channelLengthUm,tg.channelWidthUm],[17,8,6,15]);
 assert.deepEqual(sg.metalStackNm,[['Ti',10],['Pt',150],['Au',50]]);assert.deepEqual(tg.metalStackNm,[['Ti',5],['Au',100]]);
 assert(!('gate' in sg));assert(tg.gate.startsWith('external'));
});
test('equipment class codes and stage lists are internally consistent',()=>{
 for(const a of Object.values(m.modes)){assert(a.route.length===8);assert(m.docs[a.source]);for(const b of a.route)assert(b.equipment.every(e=>m.tools[e]))}
});
test('256 passive sites with distinct logical lines and centered witness geometry',()=>{
 const a=p().result;assert.equal(a.rows.length,256);assert.equal(new Set(a.rows.map(x=>x.logicalOutputs[0])).size,256);
 assert.deepEqual(a.rows[0].centerUm,[-225,225]);assert.deepEqual(a.rows[255].centerUm,[225,-225]);assert.equal(a.counts.valid,256);assert.equal(a.counts.goodRoutes,256);
});
test('passive output withheld before inert inspection',()=>{const a=p({stage:6});assert.equal(a.result.counts.goodRoutes,256);assert.equal(a.result.counts.valid,0);assert.equal(m.passiveZ(a.result.selected).length,0);assert.throws(()=>m.csv(a))});
test('passive covered window is not a dry open',()=>{
 const a=p({fault:'cover'}).result;assert.equal(a.counts.goodRoutes,256);assert.equal(a.counts.valid,255);assert.equal(a.selected.dry,'Mapped');assert.equal(a.selected.wet,'Blocked window');assert.equal(m.passiveZ(a.selected).length,0);
});
test('passive fault stays on its own site while inspecting a neighbor',()=>{
 const a=p({fault:'open',inspect:138}).result;assert.equal(a.counts.goodRoutes,255);assert.equal(a.counts.open,1);assert.equal(a.rows[137].dry,'Open trace');assert(a.rows[138].spectrumReady);
});
test('neighbor bridge shares two outputs and blocks both spectra',()=>{
 const a=p({fault:'short'}).result;assert.equal(a.counts.short,2);assert.equal(a.counts.goodRoutes,254);assert.deepEqual(a.rows[137].logicalOutputs,['E138','E139']);assert(!a.rows[138].spectrumReady);assert(a.rows[139].spectrumReady);
});
test('low apparent Z from a leakage flag is not a good channel',()=>{
 const a=p({fault:'breach'}).result,b=p().result;assert.equal(a.counts.goodRoutes,256);assert.equal(a.counts.abnormalSpectrum,1);assert.equal(a.counts.valid,255);
 assert(m.passiveZ(a.selected,[1000])[0].absOhm<m.passiveZ(b.selected,[1000])[0].absOhm);
});
test('missing passive reference masks all spectra without changing device routes',()=>{
 const a=p({fault:'reference'}).result;assert.equal(a.ref,false);assert.equal(a.counts.goodRoutes,256);assert.equal(a.counts.valid,0);assert(a.rows.every(e=>!e.spectrumReady));
});
test('passive circuit has correct causal sign and frequency behavior',()=>{
 const z=m.passiveZ(p().result.selected);assert.equal(z.length,20);
 for(let i=0;i<z.length;i++){const x=z[i];assert(x.realOhm>0&&x.imagOhm<0&&x.phaseDeg>-90&&x.phaseDeg<0);if(i)assert(x.absOhm<z[i-1].absOhm);}
 assert.throws(()=>m.passiveZ(p().result.selected,[0]));
});
test('true OECT has separate source drain and gate roles with gated conduction after inspection',()=>{
 const a=o({stage:2});assert(a.result.sources.s&&a.result.sources.d);assert(!a.result.polymer&&!a.result.path&&!a.result.sources.g);
 const b=o({stage:3});assert(b.result.polymer&&b.result.path&&!b.result.windowOpen);
 const c=o({stage:5});assert(c.result.windowOpen&&c.result.sources.g&&c.result.drive);assert.equal(c.result.sweep.length,0);
 assert.equal(o().result.status,'Isolated gated channel');assert.equal(o().result.sweep.length,61);
});
test('p-type depletion conventions: signed current moves toward zero, gm positive',()=>{
 const a=o(),x=a.result.sweep;assert.equal(a.vD,-.4);assert(x.every(y=>y.iDuA<0&&y.gmUS>0));for(let i=1;i<x.length;i++)assert(x[i].iDuA>x[i-1].iDuA);
 assert.equal(x[33].gmUS,Math.max(...x.map(y=>y.gmUS)));
 const FD=(o({vG:.331}).result.selected.iDuA-o({vG:.329}).result.selected.iDuA)/.002;
 assert(Math.abs(FD-x[33].gmUS)<.02,[FD,x[33].gmUS]);
});
test('drain reference and units: zero V_D gives zero curricular ID and gm',()=>{
 const a=o({vD:0}).result;assert(a.sweep.every(x=>x.iDuA===0&&x.gmUS===0));assert(a.sweep.at(-1).iGnA>0);
});
test('electronic lead opens suppress ID without smearing all faults together',()=>{
 for(const [key,label] of [['source','s'],['drain','d']]){const a=o({fault:key}).result;assert(!a.sources[label]);assert(!a.path);assert(a.sweep.every(x=>x.iDuA===0&&x.gmUS===0));assert.equal(a.status,'Open S–D path')}
});
test('channel covering and missing gate both lose modulation, but only covering closes window',()=>{
 const a=o({fault:'covered'}).result,b=o({fault:'gate'}).result;
 assert(a.path&&!a.drive&&a.sources.g&&!a.windowOpen);
 assert(b.path&&!b.drive&&!b.sources.g&&b.windowOpen);
 for(const x of [a,b]){assert.equal(x.sweep[0].iDuA,x.sweep.at(-1).iDuA);assert(x.sweep.every(q=>q.gmUS===0));assert(x.sweep[0].iDuA<0)}
});
test('passivation breach retains channel response but changes gate leakage; bridge is bypass',()=>{
 const a=o({fault:'leakage'}).result,b=o().result,c=o({fault:'bridge'}).result;
 assert.equal(a.selected.gmUS,b.selected.gmUS);assert(a.selected.iGnA>100*b.selected.iGnA);assert.equal(a.status,'Feedthrough leak');
 assert.equal(c.status,'Metal bypass');assert(c.sweep.every(q=>q.gmUS===0&&q.iDuA===c.sweep[0].iDuA));
});
test('exports are mode-specific and literature benchmark is not numerical calibration',()=>{
 const e=m.csv(p()),t=m.csv(o());assert(e.startsWith('synthetic_site_id'));assert(!e.includes('drain_V'));assert.equal(e.trim().split('\n').length,257);
 assert(t.startsWith('synthetic_gate_V'));assert(!t.includes('abs_Z'));assert.equal(t.trim().split('\n').length,62);
 const r=m.report(o());assert.equal(r.publishedFigure2Benchmark.peakGmUS,900);assert.notEqual(Math.max(...r.syntheticTransfer.map(q=>q.gmUS)),900);
 assert(m.report(p()).syntheticImpedance.length===20);assert(!('syntheticTransfer' in m.report(p())));
});
