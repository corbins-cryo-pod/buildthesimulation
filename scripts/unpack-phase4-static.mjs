/** Build-time, stdlib-only loader for the BuildTheSimulation Phase 4 frozen runtime files. */
import {constants} from 'node:fs';
import {lstat, mkdir, mkdtemp, open, readdir, rename, rm, rmdir, writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {basename, dirname, join, resolve, parse} from 'node:path';
import {fileURLToPath} from 'node:url';

export const SCHEMA='bts.phase4-static.payload.v1';
export const APPROVAL_SCHEMA='bts.phase4-static.approved.v1';
export const REQUIRED=Object.freeze(['equipment-phase4','simulations/verified-workflows']);
export const OPTIONAL='crystal-palace-downloads';
export const ROOTS=Object.freeze([...REQUIRED,OPTIONAL].sort());
export const CHUNK_MAX=2_650_000; // bytes, before git API base64 transport
export const FILE_MAX=25*1024*1024; // Pages per-asset ceiling
export const COUNT_MAX=20_000; // Pages Free site ceiling
export const PAYLOAD_MAX=300_000_000; // Verify the entire prefix before writing.
export const MANIFEST_MAX=4_000_000;
const shaRE=/^[a-f0-9]{64}$/;
export const isDigest=v=>typeof v==='string'&&shaRE.test(v);
export const cmp=(a,b)=>a<b?-1:a>b?1:0;
export const digest=b=>createHash('sha256').update(b).digest('hex');
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const need=(ok,message)=>{if(!ok)throw Error(message);};
const isObject=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const shape=(o,keys)=>isObject(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
export const optional=async p=>{try{return await lstat(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}};

export function rootFor(p) {
  return typeof p==='string'&&ROOTS.find(root=>p.startsWith(root+'/'))||null;
}
export function safeRelative(p) {
  if(typeof p!=='string'||p.length>500||!rootFor(p))return false;
  const s=p.split('/');
  return s.length<=16 && s.every(k=>k.length<=150&&/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(k)
      && !k.endsWith('.')&&!/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(k));
}

export function publicRoots(paths){
  const found=new Set(paths.map(rootFor));
  need(!found.has(null)&&REQUIRED.every(k=>found.has(k)),'Mandatory Phase 4 roots missing or path outside allowlist');
  return ROOTS.filter(r=>found.has(r));
}

export function checkPaths(paths) {
  need(Array.isArray(paths)&&paths.length<=COUNT_MAX,'Too many public runtime paths');
  const hits=new Map(), locations=new Set();
  for(const p of paths) {
    need(safeRelative(p),'Unsafe runtime path: '+JSON.stringify(p));
    const parts=p.split('/');
    for(let i=1;i<=parts.length;i++) {
      const prefix=parts.slice(0,i).join('/'), key=prefix.toLowerCase(), leaf=i===parts.length;
      const previous=hits.get(key);
      need(!previous||(!leaf&&!previous.leaf&&previous.prefix===prefix),'Duplicate, case-ambiguous or overlapping runtime path: '+p);
      if(!previous)hits.set(key,{prefix,leaf});
      if(!leaf)locations.add(prefix);
    }
  }
  return [...locations].sort(cmp);
}

export async function safeDirectory(path) {
  const abs=resolve(path), root=parse(abs).root;
  let current=root;
  for(const part of abs.slice(root.length).split(/[\\/]/).filter(Boolean)) {
    current=join(current,part);
    const st=await lstat(current);
    need(st.isDirectory()&&!st.isSymbolicLink(),'Not a real directory or symlink forbidden: '+current);
  }
  return abs;
}

export async function readRegular(path, bytesOrMax, exact=true) {
  const info=await lstat(path);
  need(info.isFile()&&!info.isSymbolicLink(),'Not a regular file or symlink forbidden: '+path);
  need(exact?info.size===bytesOrMax:info.size<=bytesOrMax,'File byte count does not match: '+path);
  const fh=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try {
    const stat=await fh.stat();
    need(stat.isFile()&&stat.dev===info.dev&&stat.ino===info.ino&&stat.size===info.size,'File changed while opening: '+path);
    const data=await fh.readFile();
    need(data.length===info.size,'File changed while reading: '+path);
    return data;
  } finally {await fh.close();}
}

function exactNames(got,want,what) {
  need(got.length===want.length&&[...got].sort(cmp).every((g,i)=>g===want[i]),'Unexpected, missing or stale '+what);
}

export function validateManifest(m) {
  need(shape(m,['schema','chunkMaxBytes','chunks','blobs','files'])&&m.schema===SCHEMA&&m.chunkMaxBytes===CHUNK_MAX,'Unrecognized runtime payload manifest');
  need(Array.isArray(m.chunks)&&m.chunks.length>=1&&m.chunks.length<=400&&Array.isArray(m.blobs)&&m.blobs.length<=COUNT_MAX&&Array.isArray(m.files)&&m.files.length>=2&&m.files.length<=COUNT_MAX,'Invalid manifest arrays');
  let chunkSum=0;
  const ranges=m.chunks.map((c,i)=>{
    const name='chunk-'+String(i).padStart(3,'0')+'.bin';
    need(shape(c,['file','bytes','sha256'])&&c.file===name&&integer(c.bytes,1,CHUNK_MAX)&&isDigest(c.sha256),'Invalid chunk row: '+name);
    chunkSum+=c.bytes;
    need(chunkSum<=PAYLOAD_MAX,'Runtime payload exceeded its verification byte budget');
    return [];
  });
  const listed=new Map();
  for(const b of m.blobs) {
    need(shape(b,['sha256','bytes','parts'])&&isDigest(b.sha256)&&integer(b.bytes,0,FILE_MAX)
      &&Array.isArray(b.parts)&&b.parts.length>=1&&b.parts.length<=100,'Invalid blob row');
    need(!listed.has(b.sha256),'Duplicate blob digest: '+b.sha256);
    let sum=0;
    for(const part of b.parts) {
      need(shape(part,['chunk','offset','bytes','rawBytes'])&&integer(part.chunk,0,m.chunks.length-1)
        &&integer(part.offset,0,CHUNK_MAX-1)&&integer(part.bytes,20,CHUNK_MAX)
        &&integer(part.rawBytes,b.bytes===0?0:1,FILE_MAX)
        &&part.offset+part.bytes<=m.chunks[part.chunk].bytes,'Invalid gzip member coordinates');
      ranges[part.chunk].push(part);
      sum+=part.rawBytes;
    }
    need(sum===b.bytes&&(b.bytes!==0||b.parts.length===1),'Blob decoded length does not match: '+b.sha256);
    listed.set(b.sha256,b);
  }
  for(const [i,extent] of ranges.entries()) {
    extent.sort((a,b)=>a.offset-b.offset);
    let pos=0;
    for(const part of extent){need(part.offset===pos,'Gap or overlap in chunk '+i);pos+=part.bytes;}
    need(pos===m.chunks[i].bytes,'Unreferenced bytes in chunk '+i);
  }
  const referenced=new Set();
  const paths=[];
  let bytes=0;
  for(const f of m.files) {
    need(shape(f,['path','sha256','bytes'])&&listed.has(f.sha256)&&f.bytes===listed.get(f.sha256).bytes,'Invalid release file row');
    paths.push(f.path);referenced.add(f.sha256);bytes+=f.bytes;
    need(bytes<=800_000_000,'Decoded runtime exceeded its verification byte budget');
  }
  need(referenced.size===listed.size,'Manifest has unreferenced blob data');
  const dirs=checkPaths(paths), roots=publicRoots(paths);
  need(paths.every((p,i)=>i===0||cmp(paths[i-1],p)<0),'File paths must be in canonical order');
  need(m.blobs.every((b,i)=>i===0||cmp(m.blobs[i-1].sha256,b.sha256)<0),'Blob hashes must be in canonical order');
  return {dirs,bytes,roots};
}

export async function readPayload(payloadDir) {
  const base=await safeDirectory(payloadDir);
  const bytes=await readRegular(join(base,'manifest.json'),MANIFEST_MAX,false);
  const manifest=JSON.parse(bytes.toString('utf8'));
  need(bytes.equals(Buffer.from(JSON.stringify(manifest)+'\n')),'Noncanonical or ambiguous payload manifest bytes');
  const {dirs,bytes:totalBytes,roots}=validateManifest(manifest);
  exactNames(await readdir(base),['manifest.json',...manifest.chunks.map(c=>c.file)].sort(cmp),'files in payload directory');
  const chunks=[];
  for(const row of manifest.chunks) {
    const buf=await readRegular(join(base,row.file),row.bytes);
    need(digest(buf)===row.sha256,'Chunk SHA-256 mismatch: '+row.file);
    chunks.push(buf);
  }
  return {manifest,dirs,roots,chunks,totalBytes,manifestSha256:digest(bytes)};
}

export async function forDecodedBlob(payload,onBlob=()=>{}) {
  for(const b of payload.manifest.blobs) {
    const pieces=[];
    for(const part of b.parts) {
      const c=payload.chunks[part.chunk];
      const slice=c.subarray(part.offset,part.offset+part.bytes);
      need(slice[0]===31&&slice[1]===139&&slice[2]===8&&slice[3]===0&&slice.readUInt32LE(4)===0&&slice[9]===255&&slice.readUInt32LE(slice.length-4)===part.rawBytes,'Expected a normalized gzip member and exact decoded length for '+b.sha256);
      const bytes=gunzipSync(slice,{maxOutputLength:Math.max(1,part.rawBytes)});
      need(bytes.length===part.rawBytes,'Decoded gzip member length does not match: '+b.sha256);
      pieces.push(bytes);
    }
    const raw=pieces.length===1?pieces[0]:Buffer.concat(pieces,b.bytes);
    need(raw.length===b.bytes&&digest(raw)===b.sha256,'Decoded file SHA-256 mismatch: '+b.sha256);
    await onBlob(b,raw);
  }
}

async function exactCase(parent,name) {
  await safeDirectory(parent);
  const hits=(await readdir(parent)).filter(n=>n.toLowerCase()===name.toLowerCase());
  need(hits.length===0||(hits.length===1&&hits[0]===name),'Case-ambiguous public or stage directory: '+join(parent,name));
  return !!hits.length;
}
export {exactCase};

async function planRoot(base,root,payload) {
  const dirs=root.split('/'), leaf=dirs.pop();
  let parent=base;
  for(const name of dirs){
    const present=await exactCase(parent,name);
    const next=join(parent,name);
    if(!present)return {root,existing:false,parent:next,leaf,out:join(next,leaf),createParent:{base:parent,name}};
    await safeDirectory(next);parent=next;
  }
  const out=join(parent,leaf);
  const existing=await exactCase(parent,leaf);
  if(existing)await verifyMaterialized(out,payload,root);
  return {root,existing,parent,leaf,out,createParent:null};
}

export async function verifyMaterialized(outputDir,payload,root) {
  need(payload.roots.includes(root),'Not a declared Phase 4 prefix to verify');
  const base=await safeDirectory(outputDir);
  const prefix=root+'/';
  const paths=new Map(payload.manifest.files.filter(f=>f.path.startsWith(prefix)).map(f=>[f.path.slice(prefix.length),f]));
  const directories=new Set(payload.dirs.filter(f=>f.startsWith(prefix)).map(f=>f.slice(prefix.length))), seen=new Set();
  async function walk(dir,relative) {
    await safeDirectory(dir);
    for(const name of (await readdir(dir)).sort(cmp)) {
      const relativeChild=relative?relative+'/'+name:name;
      const child=join(dir,name), st=await lstat(child);
      need(!st.isSymbolicLink(),'Symlink in existing Phase 4 public output: '+relativeChild);
      if(st.isDirectory()){
        need(directories.delete(relativeChild),'Unexpected directory in existing Phase 4 public output: '+relativeChild);
        await walk(child,relativeChild);
      } else {
        const f=paths.get(relativeChild);
        need(st.isFile()&&f,'Unexpected file in existing Phase 4 public output: '+relativeChild);
        const data=await readRegular(child,f.bytes);
        need(digest(data)===f.sha256,'Existing public bytes do not match: '+relativeChild);
        seen.add(relativeChild);
      }
    }
  }
  await walk(base,'');
  need(seen.size===paths.size&&directories.size===0,'Existing Phase 4 public output is incomplete; no existing files changed');
}

const sameNode=(a,b)=>a&&b&&!a.isSymbolicLink()&&!b.isSymbolicLink()&&a.ino===b.ino&&a.dev===b.dev;
async function owned(path,st){
  await safeDirectory(path);
  need(sameNode(await lstat(path),st),'An unpack-owned directory changed while installing: '+path);
}
async function undo(o){
  // Only reverse children whose original inode was installed by this invocation.
  try {
    await owned(o.path,o.stat);
    for(const p of [...o.children].reverse()){
      const st=await optional(p.target);
      if(sameNode(st,p.stat)&&!(await optional(p.temporary)))await rename(p.target,p.temporary);
    }
    await rmdir(o.path);
  }catch{}
}

export async function unpack(payloadDir,publicDir,expectedManifest){
  const abs=resolve(publicDir);
  need(basename(abs)==='public','Destination must be the Astro public directory (not a route prefix or filesystem root)');
  const base=await safeDirectory(abs), parent=await safeDirectory(dirname(base));
  const project=JSON.parse((await readRegular(join(parent,'package.json'),1_000_000,false)).toString('utf8'));
  need(typeof (project.dependencies?.astro??project.devDependencies?.astro)==='string','Destination public must belong to an Astro project');
  const payload=await readPayload(payloadDir);
  if(expectedManifest!==undefined)need(isDigest(expectedManifest)&&payload.manifestSha256===expectedManifest,'Approved payload manifest SHA-256 mismatch');
  // Preflight all output prefixes before staging any. Unrelated public content is never enumerated recursively.
  const plan=[];
  for(const root of payload.roots)plan.push(await planRoot(base,root,payload));
  const summary={files:payload.manifest.files.length,bytes:payload.totalBytes,roots:payload.roots,manifestSha256:payload.manifestSha256};
  if(plan.every(p=>p.existing)){
    // Verify the compressed bytes too, even for an exact installed tree.
    await forDecodedBlob(payload);
    return {status:'verified existing',...summary};
  }
  const temp=await mkdtemp(join(parent,'.bts-phase4-static-'));
  const created=[];
  try {
    for(const d of payload.dirs)await mkdir(join(temp,d));
    const names=new Map(payload.manifest.blobs.map(b=>[b.sha256,[]]));
    for(const f of payload.manifest.files)names.get(f.sha256).push(f.path);
    // All packages and every decoded file validated before creating any output prefix.
    await forDecodedBlob(payload,async (b,raw)=>{
      for(const k of names.get(b.sha256))await writeFile(join(temp,k),raw,{flag:'wx',mode:0o644});
    });
    for(const initial of plan){
      const p=await planRoot(base,initial.root,payload);
      if(p.existing)continue;
      if(p.createParent){
        const {base:b,name}=p.createParent;
        need(!(await exactCase(b,name)),'Public parent appeared during install: '+p.parent);
        await mkdir(p.parent,{mode:0o755});
        created.push({path:p.parent,stat:await lstat(p.parent),children:[]});
      }
      need(!(await exactCase(p.parent,p.leaf)),'Public prefix appeared during install: '+p.root);
      // mkdir is exclusive: cannot replace an existing empty or concurrently created directory.
      await mkdir(p.out,{mode:0o755});
      const marker={path:p.out,stat:await lstat(p.out),children:[]};created.push(marker);
      const from=join(temp,p.root);
      for(const name of (await readdir(from)).sort(cmp)){
        await owned(p.out,marker.stat);
        const target=join(p.out,name),temporary=join(from,name);
        need(!(await optional(target)),'Output path unexpectedly appeared: '+target);
        const stat=await lstat(temporary);
        await rename(temporary,target);
        marker.children.push({temporary,target,stat});
      }
      await verifyMaterialized(p.out,payload,p.root);
    }
    return {status:'materialized',...summary};
  }catch(e){
    for(const o of [...created].reverse())await undo(o);
    throw e;
  }finally{await rm(temp,{recursive:true,force:true});}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const root=fileURLToPath(new URL('../',import.meta.url));
    const args=process.argv.slice(2);
    if(![0,2,3].includes(args.length))throw Error('Usage: node unpack-phase4-static.mjs [PAYLOAD_DIR ASTRO_PUBLIC_DIR [EXPECTED_MANIFEST_SHA256]]');
    const r=await unpack(...(args.length?args:[join(root,'payloads/phase4-static'),join(root,'public'),process.env.BTS_PHASE4_STATIC_MANIFEST_SHA256]));
    console.log('Phase 4 static:',JSON.stringify(r));
  }catch(e){console.error('Phase 4 static:',e.message);process.exitCode=1;}
}
