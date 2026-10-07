import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deviceFamilies,getDeviceFamily,groupDeviceEntries} from '../src/lib/device-families.js';
const entries=fs.readdirSync('src/content/designs').filter(f=>f.endsWith('.md')).map(f=>{
  const text=fs.readFileSync(`src/content/designs/${f}`,'utf8');
  return {slug:f.slice(0,-3),order:Number(text.match(/^order: (\d+)/m)[1]),draft:/^draft: true/m.test(text)};
}).filter(e=>!e.draft);
test('families preserve eighteen independently addressable records, six explicit groups',()=>{
  const seen=new Set();assert.equal(deviceFamilies.length,6);
  for(const family of deviceFamilies){
    assert(family.members.includes(family.featured));
    for(const order of family.members){assert(!seen.has(order));seen.add(order);assert(entries.some(e=>e.order===order));assert(family.changes[order]);}
  }
  assert.equal(seen.size,18);assert.equal(groupDeviceEntries(entries).length,entries.length-12);
  assert.equal(getDeviceFamily(109),null);assert.equal(getDeviceFamily(111),null);
});
test('filter matching an older sheet does not lose its result',()=>{
  const older=entries.find(e=>e.order===4);const groups=groupDeviceEntries([older]);
  assert.equal(groups.length,1);assert.equal(groups[0].representative.slug,older.slug);
});
test('family highlights are explicit and not all called current products',()=>{
  assert.equal(getDeviceFamily(4).featured,106);assert(getDeviceFamily(4).summary.includes('prototype'));
  assert(getDeviceFamily(5).summary.includes('does not supersede'));
  assert(getDeviceFamily(129).summary.includes('not an earlier publication'));
});
test('document layout separates catalog identity from regulatory authority',()=>{
  const s=fs.readFileSync('src/pages/devices/[slug].astro','utf8');
  assert(s.includes('Not a manufacturer-issued datasheet'));
  assert(s.includes('Human evidence does not establish approval'));
  assert(s.includes('Primary source →'));assert(s.includes('headings'));assert(s.includes('Version history and parallel configurations'));
});
