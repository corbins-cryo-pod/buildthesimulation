import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const orders=['01-','02-','04-','05-','09-'];
const sections=['Identity','Geometry and architecture','Electrode and channel physics','Tissue interface and bioresponse','System architecture','Performance envelope','Clinical and preclinical evidence','Engineering tradeoffs'];
test('restored sheets carry the broad field framework with explicit unknowns',()=>{
 const dir='src/content/designs';for(const order of orders){const file=fs.readdirSync(dir).find(x=>x.startsWith(order));const lines=fs.readFileSync(`${dir}/${file}`,'utf8').split('\n').map(l=>l.trimEnd());for(const sec of sections){assert.ok(lines.includes('## '+sec)||lines.includes('### '+sec),`${file}: missing ${sec}`);}assert.ok(lines.some(l=>/unreported/i.test(l)),`${file}: no explicit unknowns`);}
});
