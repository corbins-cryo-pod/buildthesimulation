import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('normalized legacy sheets contain explicit source-specific property groups',()=>{
 const headings={'05-utah-slanted-electrode-array-usea':['Identity','Geometry and architecture','Electrode and channel physics','Tissue interface and bioresponse','Clinical and preclinical evidence','Engineering tradeoffs','References'],'29-active-matrix-flexible-ecog-array-viventi':['Identity','Geometry and architecture','Electrode and channel physics','Tissue interface and bioresponse','Engineering tradeoffs','References'],'32-brown-implantable-wireless-neural-interface-borton':['Identity and configuration','Electrical and system specifications','Tissue interface and reliability','Evidence and regulatory boundary','Model and missing specifications','Primary sources']};
 for(const [file,heads] of Object.entries(headings)){
 const text=fs.readFileSync(`src/content/designs/${file}.md`,'utf8');
 for(const heading of heads)assert(text.includes('## '+heading),`${file}: ${heading}`);
 assert(!text.includes('Spec Card Grid'));assert(/\| Property \||\| Field \|/.test(text));
 }
});
test('USEA distinguishes physical needles from available recording paths',()=>{
 const text=fs.readFileSync('src/content/designs/05-utah-slanted-electrode-array-usea.md','utf8');
 assert(text.includes('96; four corner electrodes used as references'));assert(text.includes('16-96 channels'));assert(text.includes('measurement frequency not stated'));assert(text.includes('four/five-week'));
});
test('Brown component status is not whole-system approval',()=>{
 const text=fs.readFileSync('src/content/designs/32-brown-implantable-wireless-neural-interface-borton.md','utf8');
 assert(text.includes('not retrieved FDA clearance evidence for the complete Brown'));assert(text.includes('active skin cooling'));assert(text.includes('proposed extension to 16-hour'));
});
