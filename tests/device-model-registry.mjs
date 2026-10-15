import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deviceModels, getContactGeometry} from '../src/lib/devices/catalog.js';
import {implantedKinds} from '../src/lib/devices/implant-contacts.js';
const currentIds = new Set();
for(const f of fs.readdirSync('src/content/designs')) {
 if(!f.endsWith('.md'))continue;
 const s=fs.readFileSync(`src/content/designs/${f}`,'utf8');
 if(!/^draft: true$/m.test(s))currentIds.add(s.match(/^device_id: ["']?([^"'\n]+)/m)?.[1]);
}
test('every geometry resolves to the exact visible device and preserves evidence',()=>{
 const ids=new Set();
 for(const [id,m] of Object.entries(deviceModels)) {
  assert(currentIds.has(id),`unpublished device ${id}`);assert.equal(id,m.deviceId);
  assert(!ids.has(m.id),`duplicate model id ${m.id}`);ids.add(m.id);
  const content=fs.readFileSync(`src/content/designs/${m.slug}.md`,'utf8');assert(content.includes(id));
  assert(m.sources.length>0);for(const source of m.sources)assert.equal(new URL(source.url).protocol,'https:');
  assert(m.notes.length>80);assert.equal(getContactGeometry(m).length,m.physicalSites);
  if(m.fidelity){for(const key of ['documented','reconstructed','omitted'])assert(Array.isArray(m.fidelity[key])&&m.fidelity[key].length>0,`${id}: ${key}`);assert(m.modeledScope);}
 }
});
test('new contact surfaces fit documented local crops and unknown maps remain unknown',()=>{
 for(const m of Object.values(deviceModels).filter(m=>implantedKinds.has(m.kind))) {
  for(const s of getContactGeometry(m)) {assert.equal(s.channel,null);assert(s.positionMeaning);assert(s.positionMm.every(Number.isFinite));}
  if(m.kind==='planar-probe') {
   for(const p of m.contactLayout) {
    assert(p.z-p.size/2>=0&&p.z+p.size/2<=m.length,`${m.id}: contact outside shank length`);
    const centers=Array.from({length:m.shankCount??1},(_,i)=>(i-((m.shankCount??1)-1)/2)*(m.shankPitch??0));
    assert(centers.some(x=>Math.abs(p.x-x)+p.size/2<=m.width/2+1e-9),`${m.id}: contact outside shank width`);
   }
  }
  if(m.kind==='cylindrical-lead')for(const c of m.contacts){assert(c.z-c.length/2>=-1e-8&&c.z+c.length/2<=m.length+1e-8);assert(c.segments>=1);if(c.segments>1)assert(c.gapAngle>=0&&c.gapAngle<2*Math.PI/c.segments);}
  if(m.kind==='nerve-cuff')for(const c of m.contacts){assert(c.z-c.length/2>=0&&c.z+c.length/2<=m.length);assert(c.angularSpan>0&&c.angularSpan<=2*Math.PI);}
  if(m.kind==='flat-cuff')for(const c of m.contacts){assert(Math.abs(c.x)+c.diameter/2<=m.innerWidth/2);assert.equal(Math.abs(c.y),m.innerHeight/2);assert(c.z-c.diameter/2>=0&&c.z+c.diameter/2<=m.length);}
 }
});
