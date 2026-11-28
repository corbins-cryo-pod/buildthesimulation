'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={module:{exports:{}},setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync(require.resolve('./bench-play.js'),'utf8'),scope);
const {create,playLabel}=scope.module.exports;
let id=0,painted=[],live=new Map(),old=new Map();
const clock={
 setTimeout(fn,ms){assert.equal(ms,30);const k=++id;live.set(k,fn);old.set(k,fn);return k;},
 clearTimeout(k){live.delete(k);}
};
const p=create({clock,delay:30,paint:s=>painted.push(s)});
const state=(progress,total,mode,timers)=>{assert.deepEqual({...p.snapshot()},{progress,total,mode,running:mode==='running'});assert.equal(live.size,timers);};
function advance(){const [k,fn]=live.entries().next().value;live.delete(k);fn();return k;}
p.load(4);state(0,4,'ready',0);p.toggle();state(1,4,'running',1);
const initialId=id;p.toggle();state(1,4,'paused',0);old.get(initialId)();state(1,4,'paused',0);
p.toggle();state(1,4,'running',1);advance();state(2,4,'running',1);const oldCase=id;
p.load(2);state(0,2,'ready',0);p.toggle();state(1,2,'running',1);old.get(oldCase)();state(1,2,'running',1);
advance();state(2,2,'complete',0);assert.equal(playLabel[p.snapshot().mode],'Replay workflow');
p.toggle();state(1,2,'running',1);p.next();state(2,2,'complete',0);
p.previous();state(1,2,'paused',0);p.reset();state(0,2,'ready',0);p.finish();state(2,2,'complete',0);
p.load(0);p.toggle();state(0,0,'ready',0);
assert.throws(()=>p.load(-1),{name:'RangeError'});assert.throws(()=>p.go(NaN),{name:'RangeError'});
assert(painted.every(s=>s.progress<=s.total));
console.log('PASS: shared clock continuation, replay, stop, manual selection, early return, and canceled callback isolation.');
