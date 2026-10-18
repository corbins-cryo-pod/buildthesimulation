import test from 'node:test';
import assert from 'node:assert/strict';
import { mountFiniteLaboratory } from '../src/lib/cortex/finite-ui.js';

test('finite workspace unmount cancels animation, detaches controls and ignores late loads',async()=>{
  const keys=['document','fetch','requestAnimationFrame','cancelAnimationFrame'];
  const previous=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
  class Element extends EventTarget {
    value='';textContent='';disabled=false;
    append(){} replaceChildren(){}
    getContext(){return {clearRect(){}};}
  }
  const elements=new Map();
  const root={querySelector(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);}};
  root.querySelector('#disk-mesh').value='40';root.querySelector('#disk-dt').value='.005';root.querySelector('#disk-current').value='1';root.querySelector('#disk-offset').value='0';
  let scheduled=0,cancelled=0;
  globalThis.document={createElement:()=>new Element(),createElementNS:()=>{throw Error('No WebGL in lifecycle test');}};
  globalThis.fetch=async()=>{throw Error('Delayed asset failure');};
  globalThis.requestAnimationFrame=()=>++scheduled;
  globalThis.cancelAnimationFrame=id=>{cancelled=id;};
  try{
    const dispose=mountFiniteLaboratory(root);
    assert.equal(scheduled,1);
    dispose();assert.equal(cancelled,1);
    const before=root.querySelector('#disk-status').textContent;
    root.querySelector('#disk-cancel').dispatchEvent(new Event('click'));
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.equal(root.querySelector('#disk-status').textContent,before);
    assert.match(root.querySelector('#disk-scene').textContent,/3D unavailable/);
  }finally{for(const k of keys)previous[k]===undefined?delete globalThis[k]:globalThis[k]=previous[k];}
});
