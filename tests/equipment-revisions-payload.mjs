import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, readdir, rm, lstat, symlink} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pack,verifyApproval} from '../scripts/pack-equipment-revisions.mjs';
import {unpack,readPayload,safeRelative,validateManifest,digest,CHUNK_MAX} from '../scripts/unpack-equipment-revisions.mjs';

const S='bts.device-web-pack.v1';
const main=await mkdtemp(join(tmpdir(),'bts-equipment-payload-test-'));
async function exists(p) {try{await lstat(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
const save=(p,v)=>writeFile(p,JSON.stringify(v)+'\n');
function row(id,status,entries){
  const [entry]=Object.keys(entries);
  return {id,status,entry,files:Object.entries(entries).map(([target,b])=>({target,bytes:b.length,sha256:digest(b)})),
    browserProof:{outcome:'pass',entrySha256:digest(entries[entry])}};
}
const bytes=Buffer.from('<p>Original launch fixture</p>\r\n');
const sameLengthTamper=Buffer.from(bytes).fill(120,3,11);
const big=Buffer.alloc(CHUNK_MAX+77_777);
// Deterministic pseudo-random bytes make a gzip member too large for a chunk.
for(let offset=0;offset<big.length;offset+=32)createHash('sha256').update('fixture-'+offset).digest().copy(big,offset);
const base={schema:S,pathPrefix:'/equipment-revised/',
  browserQaJoin:{idPassRequiresEntrySha:true,joinedReportSha256:digest(Buffer.from('synthetic independent fixture'))},records:[
  row('02-02','ready',{'index.html':bytes,'data/fixed.bin':big,'empty.txt':Buffer.alloc(0)}),
  row('05-05','ready',{'index.html':bytes}),
  row('05-06','candidate',{'index.html':bytes}),
  row('05-07','blocked',{'index.html':bytes}),
]};
const stage=join(main,'stage'), release=join(main,'release.json'), pkg=join(main,'pkg'), pkg2=join(main,'pkg2');
await mkdir(stage);
for(const r of base.records)for(const f of r.files) {
  const p=join(stage,r.id,f.target);
  await mkdir(dirname(p),{recursive:true});
  await writeFile(p,f.target==='data/fixed.bin'?big:f.target==='empty.txt'?Buffer.alloc(0):bytes);
}
await save(release,base);

try {
 await test('deterministic independent gzip members; dedup, exact bytes, ready-only, idempotent',async()=>{
  const first=await pack(stage,release,pkg), repeat=await pack(stage,release,pkg2);
  assert.deepEqual(first,repeat);
  assert.equal(first.files,4);assert.equal(first.uniqueBlobs,3);assert.ok(first.chunks>=2);
  for(const f of await readdir(pkg))assert.deepEqual(await readFile(join(pkg,f)),await readFile(join(pkg2,f)));
  const payload=await readPayload(pkg);
  assert.ok(payload.manifest.chunks.every(c=>c.bytes<=CHUNK_MAX));
  assert.ok(payload.manifest.blobs.find(b=>b.bytes===big.length).parts.length>1);
  const root=join(main,'public');await mkdir(root);
  const out=join(root,'equipment-revised');
  assert.equal((await unpack(pkg,out)).status,'materialized');
  assert.equal((await unpack(pkg,out)).status,'verified existing');
  assert.deepEqual(await readFile(join(out,'02-02/data/fixed.bin')),big);
  assert.deepEqual(await readFile(join(out,'02-02/index.html')),bytes);
  assert.deepEqual(await readFile(join(out,'05-05/index.html')),bytes);
  assert.deepEqual(await readFile(join(out,'02-02/empty.txt')),Buffer.alloc(0));
  assert.equal(await exists(join(out,'05-06')),false);assert.equal(await exists(join(out,'05-07')),false);
  assert.equal((await verifyApproval(release,pkg)).approvedExactMatch,true);
  const fakeReady=join(main,'false-ready.json');
  const absent=structuredClone(base);delete absent.records[0].browserProof;await save(fakeReady,absent);
  await assert.rejects(verifyApproval(fakeReady,pkg),/Exactly matched independent browser proof/);
  const wrongHash=structuredClone(base);wrongHash.records[0].browserProof.entrySha256='a'.repeat(64);await save(fakeReady,wrongHash);
  await assert.rejects(verifyApproval(fakeReady,pkg),/Exactly matched independent browser proof/);
  const candidate=join(main,'cand');await pack(stage,release,candidate,{allowCandidates:true});
  await assert.rejects(verifyApproval(release,candidate),/Approved ready release paths or bytes differ/);
  const fullyApproved=join(main,'fully-approved.json');const ready=structuredClone(base);
  ready.records[2].status='ready';await save(fullyApproved,ready);
  assert.equal((await verifyApproval(fullyApproved,candidate)).approvedExactMatch,true);
  // Existing corruption is refused rather than overwritten or cleaned up.
  await writeFile(join(out,'02-02/index.html'),sameLengthTamper);
  await assert.rejects(unpack(pkg,out),/Existing runtime bytes do not match/);
  assert.deepEqual(await readFile(join(out,'02-02/index.html')),sameLengthTamper);
  await writeFile(join(out,'02-02/index.html'),bytes);
  await writeFile(join(out,'extra.html'),'unchanged');
  await assert.rejects(unpack(pkg,out),/Unexpected file/);
  await rm(join(out,'extra.html'));
  await rm(join(out,'02-02/empty.txt'));
  await assert.rejects(unpack(pkg,out),/incomplete/);
 });

 await test('symlinks in staging, sources, package parent, and output are rejected',async()=>{
  const fakeStage=join(main,'fake-stage');await symlink(stage,fakeStage,'dir');
  await assert.rejects(pack(fakeStage,release,join(main,'z')),/symlink forbidden/);
  const linkFile=join(main,'fake-release.json');await symlink(release,linkFile);
  await assert.rejects(pack(stage,linkFile,join(main,'z')),/symlink forbidden/);
  const stageFile=join(stage,'05-05/index.html');
  await rm(stageFile);await symlink(join(stage,'02-02/index.html'),stageFile);
  await assert.rejects(pack(stage,release,join(main,'z')),/symlink forbidden/);
  await rm(stageFile);await writeFile(stageFile,bytes);
  const fakePackage=join(main,'fake-package');await symlink(pkg,fakePackage,'dir');
  await assert.rejects(unpack(fakePackage,join(main,'z')),/symlink forbidden/);
  const existing=join(main,'symlinks-out');await unpack(pkg,existing);
  await rm(join(existing,'02-02/index.html'));await symlink(join(stage,'02-02/index.html'),join(existing,'02-02/index.html'));
  await assert.rejects(unpack(pkg,existing),/Symlink in existing runtime output/);
  const child=join(main,'cannot-follow-external');await symlink(existing,child,'dir');
  await assert.rejects(unpack(pkg,join(child,'output')),/symlink forbidden/);
  const e=join(main,'externally-out');await symlink(existing,e,'dir');
  await assert.rejects(unpack(pkg,e),/symlink forbidden/);
  const c=join(pkg2,'chunk-000.bin');await rm(c);await symlink(join(pkg,'chunk-000.bin'),c);
  await assert.rejects(unpack(pkg2,join(main,'must-not-exist')),/symlink forbidden/);
  assert.equal(await exists(join(main,'must-not-exist')),false);
 });

 await test('traversal, aliases, ambiguous case, and chunk interval misuse fail closed',async()=>{
  const m=(await readPayload(pkg)).manifest;
  for(const p of ['/02-02/index.html','02-02/../elsewhere','02-02/a/../../z','02-02/%2e%2e/x','02-02/.git/config','02-02/a\\b','02-02/a//b','02-02/C:\\evil','02-02/COM1.txt','02-02/end.','02-02/ space','26-92/index.html']){
    assert.equal(safeRelative(p),false,p);
    const copy=structuredClone(m);copy.files[0].path=p;assert.throws(()=>validateManifest(copy),/Unsafe runtime path/);
  }
  for(const [a,b] of [['02-02/X.html','02-02/x.HTML'],['02-02/z','02-02/z/w'],['02-02/A/b','02-02/a/c'],['02-02/same','02-02/same']]){
    const copy=structuredClone(m);copy.files[0].path=a;copy.files[1].path=b;assert.throws(()=>validateManifest(copy),/Duplicate, case-ambiguous or overlapping/);
  }
  {const c=structuredClone(m);c.blobs[0].parts[0].offset++;assert.throws(()=>validateManifest(c),/chunk|gzip/);}
  {const c=structuredClone(m);c.chunks[0].file='../payload.bin';assert.throws(()=>validateManifest(c),/Invalid chunk row/);}
  {const c=structuredClone(m);c.blobs[0].bytes++;assert.throws(()=>validateManifest(c),/Blob decoded length/);}
 });

 await test('chunk tamper, a valid gzip with invalid decoded SHA, and an expansion bound refuse without destination',async()=>{
  const cases=[
    {title:'chunk',buf:x=>{const g=Buffer.from(x);g[11]^=4;return g;},modifyMetadata:false,error:/Chunk SHA-256 mismatch/},
    {title:'raw-hash',buf:()=>gzipSync(sameLengthTamper),modifyMetadata:true,error:/Decoded file SHA-256 mismatch/},
    {title:'expand',buf:()=>gzipSync(Buffer.alloc(12_000,69)),modifyMetadata:true,error:/buffer larger|Cannot create|output length/i},
  ];
  for(const c of cases){
    const dir=join(main,'corrupt-payload-'+c.title), out=join(main,'corrupt-output-'+c.title);
    await mkdir(dir);
    const sha=digest(bytes), member=c.buf(gzipSync(bytes)), manifest={
      schema:'bts.equipment-revisions.payload.v1',chunkMaxBytes:CHUNK_MAX,
      chunks:[{file:'chunk-000.bin',bytes:member.length,sha256:c.modifyMetadata?digest(member):digest(gzipSync(bytes))}],
      blobs:[{sha256:sha,bytes:bytes.length,parts:[{chunk:0,offset:0,bytes:member.length,rawBytes:bytes.length}]}],
      files:[{path:'02-02/index.html',sha256:sha,bytes:bytes.length}],
    };
    await save(join(dir,'manifest.json'),manifest);await writeFile(join(dir,'chunk-000.bin'),member);
    await assert.rejects(unpack(dir,out),c.error);
    assert.equal(await exists(out),false);
    assert.ok((await readdir(main)).every(n=>!n.startsWith('.bts-equipment-revised-')));
  }
 });
}finally{await rm(main,{recursive:true,force:true});}
