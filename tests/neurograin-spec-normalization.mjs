import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const s=fs.readFileSync('src/content/designs/25-neurograins-wireless-microimplant-network.md','utf8');
test('neurograin spec distinguishes recording quality, timing estimates and later stimulation',()=>{
 for(const t of ['1 kHz','8 bits','Less than 30 µW','12 illustrated','425 / 588 / 770','Later stimulation branch','three months','stimulation-only hardware','Model and missing specifications','main article body is access-restricted'])assert.ok(s.includes(t),t);
 assert.ok(!s.includes('### Spec Card Grid'));
});
