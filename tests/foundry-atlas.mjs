import { readFileSync,readdirSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
const root = new URL("../",import.meta.url);
const read = p => readFileSync(new URL(p,root),"utf8");
const html=read("public/simulations/foundry/atlas/index.html");
const data=JSON.parse(html.match(/<script type="application\/json" id="atlas-data">([\s\S]*?)<\/script>/)[1]);
const by=(array,k)=>new Map(array.map(x=>[x[k],x]));
const p=by(data.profiles,"id"), d=by(data.devices,"slug"), e=by(data.equipment,"id");
test("atlas covers exactly the public catalog and exact register IDs",()=>{
 const published=readdirSync(new URL("src/content/designs/",root)).filter(f=>/\.mdx?$/.test(f)).filter(f=>!/^draft:\s*true\s*$/m.test(read("src/content/designs/"+f).split("---")[1])).map(f=>f.replace(/\.mdx?$/,"")).sort();
 const zs=readdirSync(new URL("src/data/equipment/zones/",root)).filter(f=>f.endsWith(".json"));
 const equipment=zs.flatMap(z=>JSON.parse(read("src/data/equipment/zones/"+z)).map(r=>r.id)).sort();
 assert.equal(d.size,data.devices.length);
 assert.equal(e.size,data.equipment.length);
 assert.deepEqual([...d.keys()].sort(),published);
 assert.deepEqual([...e.keys()].sort(),equipment);
});
test("atlas cross-references, unique IDs and evidence counts are consistent",()=>{
 assert.equal(p.size,data.profiles.length);
 const sum={};for(const x of data.devices){
  assert.equal(x.profileIds.length===0,x.status==="queued");
  assert.equal(x.profileIds.length,new Set(x.profileIds).size);
  for(const id of x.profileIds) assert.ok(p.get(id).devices.includes(x.slug),id);
  if(x.profileIds.length) assert.equal(x.status,p.get(x.profileIds[0]).evidence);
  sum[x.status]=(sum[x.status]??0)+1;
 }
 for(const [k,v] of Object.entries(data.meta.counts)) assert.equal(sum[k]??0,v,k);
 for(const x of data.profiles){
  for(const slug of x.devices) assert.ok(d.get(slug).profileIds.includes(x.id),x.id);
  if(x.lab) assert.match(x.lab,/^\/simulations\/(?:[a-z0-9-]+\/)+$/);
  for(const lab of x.extraLabs??[]){
   assert.ok(lab.title && lab.url!==x.lab,x.id);
   assert.match(lab.url,/^\/simulations\/(?:[a-z0-9-]+\/)+$/);
  }
  assert.ok(x.gaps.length,x.id);
  for(const s of x.sources) assert.equal(new URL(s.url).protocol,"https:");
  for(const s of x.steps){
   if(s.status==="documented") assert.ok(s.sourceIds?.length, x.id+" / "+s.title);
   for(const tool of s.tools) assert.ok(e.has(tool),tool);
   for(const id of s.sourceIds??[]) assert.ok(x.sources.find(y=>y.id===id),id);
   for(const id of [...(s.varies??[]),...(s.only??[])]) assert.ok(x.variants.find(y=>y.id===id),id);
  }
 }
});
test("public surfaces link to the atlas",()=>{
 for(const f of ["src/pages/simulations/foundry/index.astro","src/pages/devices/index.astro","src/pages/devices/[slug].astro","src/pages/simulations/equipment/[id].astro"]) assert.match(read(f),/\/simulations\/foundry\/atlas\//);
});
