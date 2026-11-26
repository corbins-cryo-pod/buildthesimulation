import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {buildPublicMetadata,entryParts} from '../scripts/generate-equipment-revisions.mjs';
import {revisionKind} from '../src/data/equipment-revisions-scope.mjs';
const load=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const generated=await load('../src/data/equipment-revisions.generated.json');
const registered=(await Promise.all(Array.from({length:16},(_,i)=>load('../src/data/equipment/zones/'+String(i+1).padStart(2,'0')+'.json')))).flat();
const ready=r=>r.status==='ready';
const hash=text=>createHash('sha256').update(text).digest('hex');

test('all 199 revision records keep the original stable ID; no private metadata or overclaim labels',()=>{
 assert.equal(generated.schema,'bts.equipment-revisions.public.v1');
 assert.equal(registered.length,199);
 assert.deepEqual(generated.records.map(r=>r.id),registered.map(r=>r.id));
 const rows=Object.fromEntries(generated.records.map(row=>[row.id,row]));
 for(const row of generated.records){
  assert.deepEqual(Object.keys(row),['id','kind','scope','evidence','status','entry','sha256']);
  assert.ok(['documentary','virtual'].includes(row.kind));
  assert.equal(row.kind,revisionKind(row.id));
  assert.ok(row.scope&&row.evidence.length);
  assert.ok(['ready','pending','blocked'].includes(row.status));
  assert.equal(!!row.entry,ready(row));assert.equal(!!row.sha256,ready(row));
 }
 for(const id of ['04-06','07-15','12-11','15-13'])assert.equal(rows[id].kind,'documentary',id);
 for(const id of ['02-07','05-05','10-02','16-11'])assert.equal(rows[id].kind,'virtual',id);
});

test('asset target permits legitimate filenames but never traversal, percent escapes, queries, or external URLs',()=>{
 assert.deepEqual(entryParts('app/Device Native Review.html'),['app','Device Native Review.html']);
 for(const p of ['../pass.html','/pass.html','https://bad.example/page.html','//bad.example/a.html','dir/../page.html','dir/%2e%2e/page.html','dir\\part.html','a.js','index.html?x#s','a.html#x','.//page.html','a.html\0'])assert.equal(entryParts(p),null,p);
});

test('a generated ready revision is gated on exact hash and bytes at its local public target',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'bts-eq-revisions-'));
 try{
  const rows=Object.fromEntries(registered.map(r=>[r.id,{phase2:'first bounded operator pass verified',scope:'Independent test description',evidence:['Known verification case']}]));
  const ledger=join(dir,'ledger.json'), mf=join(dir,'manifest.json'), asset=join(dir,'assets');
  await writeFile(ledger,JSON.stringify({schema:'bts.phase2.ledger.v1',records:rows}));
  const bytes='<html lang=en><title>Fixture</title></html>', id='02-07', entry='app/Fixture Review.html';
  const data={schema:'bts.device-web-pack.v1',records:[{id,status:'ready',entry,files:[{target:entry,sizeBytes:Buffer.byteLength(bytes),sha256:hash(bytes)}]},{id:'07-15',status:'blocked',entry:'buried.html',files:[]},{id:'10-02',status:'candidate',entry:'not-reviewed.html',files:[]}]};
  await mkdir(join(asset,id,'app'),{recursive:true});
  await writeFile(join(asset,id,entry),bytes);
  await writeFile(mf,JSON.stringify(data));
  const x=(await buildPublicMetadata(ledger,mf,asset)).records;
  assert.deepEqual(x.filter(ready).map(r=>[r.id,r.entry,r.sha256]),[[id,entry,hash(bytes)]]);
  assert.deepEqual(x.filter(r=>r.status==='blocked').map(r=>[r.id,r.entry,r.sha256]),[['07-15',null,null]]);
  assert.equal(x.find(r=>r.id==='10-02').status,'pending');
  await writeFile(join(asset,id,entry),bytes+'tamper');
  await assert.rejects(buildPublicMetadata(ledger,mf,asset),/does not match manifest/);
  await rm(join(asset,id,entry));
  await assert.rejects(buildPublicMetadata(ledger,mf,asset),/ENOENT/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
