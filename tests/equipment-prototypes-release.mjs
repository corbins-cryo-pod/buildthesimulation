import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('../src/data/equipment-prototypes-2026-11-27.json',import.meta.url),'utf8'));
test('prototype release preserves all 18 frozen teaching builds and their licenses',()=>{
  assert.equal(manifest.devices.length,18);
  assert.equal(new Set(manifest.devices.map(x=>x.id)).size,18);
  for(const x of manifest.devices){
    assert.match(x.id,/^\d{2}-\d{2}$/);
    assert.equal(x.href,`/equipment-prototypes/${x.id}/`);
    const html=readFileSync(new URL(`../public${x.href}index.html`,import.meta.url));
    assert.equal(createHash('sha256').update(html).digest('hex'),x.sha256,x.id);
    assert.match(html.toString('utf8'),/Permission is hereby granted/i,x.id);
    if(x.originalOfflineSha256){
      const i=html.lastIndexOf('\n<!-- Third-party license: Three.js\n');
      assert.ok(i>0,x.id);
      assert.equal(createHash('sha256').update(html.subarray(0,i)).digest('hex'),x.originalOfflineSha256,x.id);
    }
    assert.doesNotMatch(html.toString('utf8'),/libfile_fde3_|ldc1\.[a-zA-Z0-9_-]{32}|sk-[A-Za-z0-9_-]{48}/,x.id);
  }
});
