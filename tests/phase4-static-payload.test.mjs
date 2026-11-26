import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,lstat,symlink} from 'node:fs/promises';
import {join,dirname} from 'node:path';import {tmpdir} from'node:os';import{gzipSync}from'node:zlib';import{createHash}from'node:crypto';
import {pack,inventory,verifyApproval} from '../scripts/pack-phase4-static.mjs';
import {unpack,readPayload,forDecodedBlob,validateManifest,safeRelative,digest,CHUNK_MAX,SCHEMA} from '../scripts/unpack-phase4-static.mjs';
const root=await mkdtemp(join(tmpdir(),'bts-phase4-transport-test-'));
const exists=async x=>{try{await lstat(x);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const data=Buffer.from('<p>Observed display fixture.</p>\r\n');const altered=Buffer.from(data).fill(170,3,7);
const large=Buffer.alloc(CHUNK_MAX+50001);
for(let i=0;i<large.length;i+=32)createHash('sha256').update('phase4-fixture-'+i).digest().copy(large,i);
const map={
  'equipment-phase4/02-07/index.html':data,'equipment-phase4/02-07/assets/model.glb':large,'equipment-phase4/02-07/empty.txt':Buffer.alloc(0),
  'simulations/verified-workflows/path/index.html':data,'crystal-palace-downloads/chunk-1.zip':Buffer.alloc(30_000,96)};
async function put(p,b){await mkdir(dirname(p),{recursive:true});await writeFile(p,b);}
async function astro(id){const p=join(root,id,'public');await mkdir(p,{recursive:true});await writeFile(join(dirname(p),'package.json'),'{"dependencies":{"astro":"fixture-only"}}\n');return p;}
const stage=join(root,'stage'), pkg=join(root,'pkg'), approved=join(root,'approved.json');
for(const [p,b] of Object.entries(map).reverse())await put(join(stage,p),b);
await put(join(stage,'not-release-material.txt'),'outside all published roots');
const inv=await inventory(stage);await writeFile(approved,JSON.stringify(inv)+'\n');
try{
await test('byte exact inventory, bounded deduplicated multi-root and repeatability',async()=>{
 const s=await pack(stage,approved,pkg);const p2=join(root,'pkg2');const repeat=await pack(stage,approved,p2);
 assert.deepEqual(s,repeat);assert.equal(s.files,5);assert.equal(s.uniqueBlobs,4);assert.equal(s.roots.length,3);assert.equal((await verifyApproval(approved,p2)).approvedExactMatch,true);
 for(const n of await readdir(pkg))assert.deepEqual(await readFile(join(pkg,n)),await readFile(join(p2,n)));
 const pl=await readPayload(pkg);assert.ok(pl.manifest.chunks.every(c=>c.bytes<=CHUNK_MAX));assert.ok(pl.manifest.blobs.find(b=>b.bytes===large.length).parts.length>=2);
 const out=await astro('fresh');await put(join(out,'simulations/unrelated/index.html'),'keep');await put(join(out,'equipment-revised/legacy.html'),'unchanged-old');
 const u=await unpack(pkg,out,s.manifestSha256);assert.equal(u.status,'materialized');assert.equal((await unpack(pkg,out)).status,'verified existing');
 for(const [p,b] of Object.entries(map))assert.deepEqual(await readFile(join(out,p)),b);
 assert.equal(await readFile(join(out,'simulations/unrelated/index.html'),'utf8'),'keep');assert.equal(await readFile(join(out,'equipment-revised/legacy.html'),'utf8'),'unchanged-old');assert.equal(await exists(join(out,'not-release-material.txt')),false);
 const opts=join(root,'stage-without-room');for(const [p,b]of Object.entries(map).filter(([p])=>!p.startsWith('crystal-palace-downloads/')))await put(join(opts,p),b);
 const a2=join(root,'approval-2.json'),p3=join(root,'pkg3');await writeFile(a2,JSON.stringify(await inventory(opts)));await pack(opts,a2,p3);
 const q=await astro('optional-absent');await unpack(p3,q);assert.equal(await exists(join(q,'crystal-palace-downloads')),false);
});
await test('requires both roots, approved exact lengths and hash, refuses overwrite of package',async()=>{
 const no=join(root,'missing-root');await put(join(no,'equipment-phase4/index.html'),data);await assert.rejects(inventory(no),/Mandatory/);
 const p=join(stage,'equipment-phase4/02-07/index.html');await writeFile(p,altered);
 await assert.rejects(pack(stage,approved,join(root,'unexpected')),/Stage hash does not match/);await writeFile(p,data);
 await put(join(stage,'equipment-phase4/unapproved.html'),'no');await assert.rejects(pack(stage,approved,join(root,'unexpected')),/differ from the explicit approved manifest/);await rm(join(stage,'equipment-phase4/unapproved.html'));
 await assert.rejects(pack(stage,approved,pkg),/EEXIST/);await assert.rejects(pack(stage,approved,join(stage,'nested-package')),/separate from staging/);
 const approval=join(root,'wrong-approval.json'),inv2=structuredClone(inv);inv2.files[0].sha256='2'.repeat(64);await writeFile(approval,JSON.stringify(inv2));await assert.rejects(verifyApproval(approval,pkg),/Approved static paths or bytes differ/);
 assert.equal(await exists(join(root,'unexpected')),false);
});
await test('path spelling, case collisions, reserved aliases, chunk coordinate limits',async()=>{
 const m=(await readPayload(pkg)).manifest;
 for(const bad of ['/equipment-phase4/slug/index.html','equipment-phase4/../p.html','equipment-phase4/./p.html','equipment-phase4/%2e%2e/a','equipment-phase4/a\\b','equipment-phase4/a//b','equipment-phase4/.git/config','equipment-phase4/con.txt','equipment-phase4/e.','public/equipment-phase4/e','simulations/with-other/e','Equipment-phase4/e','crystal-palace-downloads','/crystal-palace-downloads/used']){
  assert.equal(safeRelative(bad),false,bad);const one=structuredClone(m);one.files[0].path=bad;assert.throws(()=>validateManifest(one),/Unsafe runtime path/);
 }
 for(const [a,b] of [['equipment-phase4/A/one','equipment-phase4/a/two'],['equipment-phase4/dir','equipment-phase4/dir/index.html'],['equipment-phase4/d/x', 'equipment-phase4/d/x']]){
  const one=structuredClone(m);one.files[1].path=a;one.files[2].path=b;assert.throws(()=>validateManifest(one),/Duplicate, case-ambiguous or overlapping/);
 }
 const p=structuredClone(m);p.blobs[0].parts[0].offset++;assert.throws(()=>validateManifest(p),/gzip|chunk/i);
 const z=structuredClone(m);z.chunks[0].file='../outside.bin';assert.throws(()=>validateManifest(z),/Invalid chunk row/);
});
await test('staging/payload/public symlinks and directory aliases fail without touching others',async()=>{
 const p=join(stage,'equipment-phase4/new');await symlink(join(stage,'equipment-phase4'),p,'dir');await assert.rejects(inventory(stage),/Symlink forbidden/);await rm(p);
 const packageLink=join(root,'pkg-alias');await symlink(pkg,packageLink,'dir');
 const publicDir=await astro('blocked');await assert.rejects(unpack(packageLink,publicDir),/symlink forbidden/);
 const p2=await astro('symlink-parent');await symlink(publicDir,join(p2,'simulations'),'dir');await assert.rejects(unpack(pkg,p2),/symlink forbidden/);
 assert.equal(await exists(join(p2,'equipment-phase4')),false);
 const p3=await astro('case-alias');await mkdir(join(p3,'Equipment-phase4'));await assert.rejects(unpack(pkg,p3),/Case-ambiguous/);
 assert.equal(await exists(join(p3,'simulations')),false);
 const p4=await astro('existing-child');await unpack(pkg,p4);const f=join(p4,'equipment-phase4/02-07/index.html');await rm(f);await symlink(join(stage,'equipment-phase4/02-07/index.html'),f);
 await assert.rejects(unpack(pkg,p4),/Symlink in existing Phase 4 public output/);
 const p5=await astro('symlink-child-prefix');await mkdir(join(p5,'simulations'));await symlink(join(p4,'simulations/verified-workflows'),join(p5,'simulations/verified-workflows'),'dir');
 await assert.rejects(unpack(pkg,p5),/symlink forbidden/);assert.equal(await exists(join(p5,'equipment-phase4')),false);
 await assert.rejects(unpack(pkg,join(root,'unknown-destination')),/Destination must/);
 const p6=join(root,'not-astro','public');await put(join(dirname(p6),'package.json'),'{}\n');await mkdir(p6);await assert.rejects(unpack(pkg,p6),/Astro project/);
});
await test('all roots preflight; wrong approved hash or stale output leaves missing roots absent',async()=>{
 const out=await astro('preflight');await put(join(out,'simulations/verified-workflows/path/index.html'),altered);
 await assert.rejects(unpack(pkg,out),/Existing public bytes do not match/);assert.equal(await exists(join(out,'crystal-palace-downloads')),false);assert.equal(await exists(join(out,'equipment-phase4')),false);
 await put(join(out,'simulations/verified-workflows/path/index.html'),data);
 await assert.rejects(unpack(pkg,out,'f'.repeat(64)),/Approved payload manifest SHA-256 mismatch/);assert.equal(await exists(join(out,'equipment-phase4')),false);
 await unpack(pkg,out);assert.deepEqual(await readFile(join(out,'equipment-phase4/02-07/assets/model.glb')),large);
 await put(join(out,'equipment-phase4/stale.txt'),'stale');await assert.rejects(unpack(pkg,out),/Unexpected file/);
 await rm(join(out,'equipment-phase4/stale.txt'));await rm(join(out,'equipment-phase4/02-07/empty.txt'));await assert.rejects(unpack(pkg,out),/incomplete/);
});
await test('chunk tamper, raw SHA mismatch, payload symlink, and expansion limit create no public files',async()=>{
  const minted=(raw)=>{const g=gzipSync(raw,{level:9});g[9]=255;g.fill(0,4,8);return g;};
  for(const k of ['wrong-compressed','wrong-raw','size','symlink','trailing-json']){
    const dir=join(root,'bad-'+k);await mkdir(dir);const payloadRaw=k==='wrong-raw'?altered:k==='size'?Buffer.alloc(9000,68):data;
    let member=minted(payloadRaw);if(k==='size')member.writeUInt32LE(data.length,member.length-4); // footer alone cannot allow oversized inflate
    const bad=Buffer.from(member);if(k==='wrong-compressed')bad[12]^=6;
    const sha=digest(data), manifest={schema:SCHEMA,chunkMaxBytes:CHUNK_MAX,chunks:[{file:'chunk-000.bin',bytes:member.length,sha256:digest(member)}],blobs:[{sha256:sha,bytes:data.length,parts:[{chunk:0,offset:0,bytes:member.length,rawBytes:data.length}]}],files:[{path:'equipment-phase4/out.html',sha256:sha,bytes:data.length},{path:'simulations/verified-workflows/out.html',sha256:sha,bytes:data.length}]};
    await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest)+(k==='trailing-json'?'\n\n':'\n'));
    if(k==='symlink'){const f=join(root,'symlink-target');await writeFile(f,bad);await symlink(f,join(dir,'chunk-000.bin'));}
    else await writeFile(join(dir,'chunk-000.bin'),bad);
    const publicDir=await astro('out-'+k);
    const re=k==='wrong-compressed'?/Chunk SHA-256 mismatch/:k==='wrong-raw'?/Decoded file SHA-256 mismatch/:k==='symlink'?/symlink forbidden/:k==='trailing-json'?/Noncanonical/:/output length|buffer larger|Cannot create|incorrect length/i;
    await assert.rejects(unpack(dir,publicDir),re);assert.equal(await exists(join(publicDir,'equipment-phase4')),false);assert.equal(await exists(join(publicDir,'simulations')),false);
  }
});
}finally{await rm(root,{recursive:true,force:true});}
