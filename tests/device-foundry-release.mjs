import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url), read=p=>readFileSync(new URL(p,root),'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
const paths={'neuropixels-foundry':'d660c6d3dbd9db55166e2cc1eabe18632a5132cc63d38b17d088dbf7533928ce','masmanidis-64d-foundry':'f85d8cdbd40e2425971ed40d65a488acd71d70ac76e2db37765120e2c1c4b4b3'};
test('foundry catalog links all three labs and two newly published engines remain byte exact',()=>{
 const reg=read('src/pages/simulations/equipment/index.astro'), hub=read('src/pages/simulations/foundry/index.astro');
 assert.ok(reg.includes('href="/simulations/foundry/"'));
 assert.ok(hub.includes('/simulations/utah-array-fabrication/'));
 for(const [slug,hash] of Object.entries(paths)){
  const html=read('public/simulations/'+slug+'/index.html'), code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(code);assert.equal(sha(code),hash);assert.ok(hub.includes('/simulations/'+slug+'/'));
  assert.match(html,new RegExp('https://buildthesimulation.com/simulations/'+slug+'/'));
  assert.doesNotMatch(html,/libfile_[\w-]{15,}|sediment:\/\/| · Offline/);
 }
});
