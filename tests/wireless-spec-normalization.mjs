import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('wireless legacy sheets distinguish implant and external acquisition',()=>{
 for(const name of ['22-neural-dust-ultrasonic-backscatter-mote','33-wireless-neurosensor-yin-2014']){
 const text=fs.readFileSync(`src/content/designs/${name}.md`,'utf8');
 for(const heading of ['Identity and configuration','Geometry and','Electrical and system specifications','Tissue interface and reliability','Evidence and regulatory boundary','Model and missing specifications','Primary sources'])assert(text.includes('## '+heading));
 assert(!text.includes('Spec Card Grid'));
 }
});
test('Brown2014 chemistry conflict and channel allocation remain explicit',()=>{
 const text=fs.readFileSync('src/content/designs/33-wireless-neurosensor-yin-2014.md','utf8');
 assert(text.includes('96; three paths carry accelerometer'));assert(text.includes('Li-SOCl₂ primary'));assert(text.includes('chemistry conflict'));assert(text.includes('200-Mbit/s capability'));assert(text.includes('not a fully implanted'));
});
test('dust primary dimensions and water-tank measurement are not generic implant specs',()=>{
 const text=fs.readFileSync('src/content/designs/22-neural-dust-ultrasonic-backscatter-mote.md','utf8');
 assert(text.includes('0.8 × 3 × 1 mm'));assert(text.includes('measured in a water tank'));assert(text.includes('separate hardware'));assert(text.includes('scopes are not collapsed'));
});
