/** Build-time, stdlib-only loader for the BuildTheSimulation equipment runtime assets. */
import {constants} from 'node:fs';
import {chmod, lstat, mkdir, mkdtemp, open, readdir, rename, rm, writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {dirname, join, resolve, parse} from 'node:path';
import {fileURLToPath} from 'node:url';

export const SCHEMA='bts.equipment-revisions.payload.v1';
export const CHUNK_MAX=2_650_000; // bytes, before git API base64 transport
export const FILE_MAX=25*1024*1024; // Pages per-asset ceiling
export const COUNT_MAX=20_000; // Pages Free site ceiling
export const PAYLOAD_MAX=1_000_000_000; // Verify the entire prefix before writing.
export const MANIFEST_MAX=4_000_000;
const shaRE=/^[a-f0-9]{64}$/;
export const isDigest=v=>typeof v==='string'&&shaRE.test(v);
export const cmp=(a,b)=>a<b?-1:a>b?1:0;
export const digest=b=>createHash('sha256').update(b).digest('hex');
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const need=(ok,message)=>{if(!ok)throw Error(message);};
const isObject=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const shape=(o,keys)=>isObject(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const optional=async p=>{try{return await lstat(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}};

export function safeRelative(p) {
  if(typeof p!=='string'||p.length>500)return false;
  const s=p.split('/');
  return s.length>=2&&s.length<=16&&/^(?:0[1-9]|1[0-6])-(?:0[1-9]|[1-9][0-9])$/.test(s[0])
    && s.every(k=>k.length<=150&&/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(k)
      && !k.endsWith('.')&&!/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(k));
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
  need(Array.isArray(m.chunks)&&m.chunks.length<=400&&Array.isArray(m.blobs)&&m.blobs.length<=COUNT_MAX&&Array.isArray(m.files)&&m.files.length<=COUNT_MAX,'Invalid manifest arrays');
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
    need(bytes<=2_000_000_000,'Decoded runtime exceeded its verification byte budget');
  }
  need(referenced.size===listed.size,'Manifest has unreferenced blob data');
  return {dirs:checkPaths(paths),bytes};
}

export async function readPayload(payloadDir) {
  const base=await safeDirectory(payloadDir);
  const bytes=await readRegular(join(base,'manifest.json'),MANIFEST_MAX,false);
  const manifest=JSON.parse(bytes.toString('utf8'));
  const {dirs,bytes:totalBytes}=validateManifest(manifest);
  exactNames(await readdir(base),['manifest.json',...manifest.chunks.map(c=>c.file)].sort(cmp),'files in payload directory');
  const chunks=[];
  for(const row of manifest.chunks) {
    const buf=await readRegular(join(base,row.file),row.bytes);
    need(digest(buf)===row.sha256,'Chunk SHA-256 mismatch: '+row.file);
    chunks.push(buf);
  }
  return {manifest,dirs,chunks,totalBytes,manifestSha256:digest(bytes)};
}

export async function forDecodedBlob(payload,onBlob=()=>{}) {
  for(const b of payload.manifest.blobs) {
    const pieces=[];
    for(const part of b.parts) {
      const c=payload.chunks[part.chunk];
      const slice=c.subarray(part.offset,part.offset+part.bytes);
      need(slice[0]===31&&slice[1]===139&&slice[2]===8,'Expected a gzip member for '+b.sha256);
      const bytes=gunzipSync(slice,{maxOutputLength:Math.max(1,part.rawBytes)});
      need(bytes.length===part.rawBytes,'Decoded gzip member length does not match: '+b.sha256);
      pieces.push(bytes);
    }
    const raw=pieces.length===1?pieces[0]:Buffer.concat(pieces,b.bytes);
    need(raw.length===b.bytes&&digest(raw)===b.sha256,'Decoded file SHA-256 mismatch: '+b.sha256);
    await onBlob(b,raw);
  }
}

export async function verifyMaterialized(outputDir,payload) {
  const base=await safeDirectory(outputDir);
  const paths=new Map(payload.manifest.files.map(f=>[f.path,f]));
  const directories=new Set(payload.dirs), seen=new Set();
  async function walk(dir,relative) {
    for(const name of (await readdir(dir)).sort(cmp)) {
      const relativeChild=relative?relative+'/'+name:name;
      const child=join(dir,name), st=await lstat(child);
      need(!st.isSymbolicLink(),'Symlink in existing runtime output: '+relativeChild);
      if(st.isDirectory()){
        need(directories.delete(relativeChild),'Unexpected directory in existing runtime output: '+relativeChild);
        await walk(child,relativeChild);
      } else {
        const f=paths.get(relativeChild);
        need(st.isFile()&&f,'Unexpected file in existing runtime output: '+relativeChild);
        const data=await readRegular(child,f.bytes);
        need(digest(data)===f.sha256,'Existing runtime bytes do not match: '+relativeChild);
        seen.add(relativeChild);
      }
    }
  }
  await walk(base,'');
  need(seen.size===paths.size&&directories.size===0,'Existing runtime output is incomplete; no existing files changed');
}

export async function unpack(payloadDir,outputDir){
  const out=resolve(outputDir);
  need(out!==parse(out).root,'Refusing to write to a filesystem root');
  const parent=await safeDirectory(dirname(out));
  const payload=await readPayload(payloadDir);
  const present=await optional(out);
  const summary={files:payload.manifest.files.length,bytes:payload.totalBytes,manifestSha256:payload.manifestSha256};
  if(present) {
    await verifyMaterialized(out,payload);
    return {status:'verified existing',...summary};
  }
  const temp=await mkdtemp(join(parent,'.bts-equipment-revised-'));
  try {
    for(const d of payload.dirs)await mkdir(join(temp,d));
    const names=new Map(payload.manifest.blobs.map(b=>[b.sha256,[]]));
    for(const f of payload.manifest.files)names.get(f.sha256).push(f.path);
    await forDecodedBlob(payload,async (b,raw)=>{
      for(const k of names.get(b.sha256))await writeFile(join(temp,k),raw,{flag:'wx',mode:0o644});
    });
    try {
      // No artifact is exposed until all chunks and every complete file are verified.
      await chmod(temp,0o755);
      if(await optional(out))throw Object.assign(Error('Destination appeared during install'),{code:'EEXIST'});
      await rename(temp,out);
    } catch(e) {
      if(e.code!=='EEXIST'&&e.code!=='ENOTEMPTY')throw e;
      await verifyMaterialized(out,payload);
      return {status:'verified existing',...summary};
    }
    return {status:'materialized',...summary};
  } finally {await rm(temp,{recursive:true,force:true});}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const root=fileURLToPath(new URL('../',import.meta.url));
    const args=process.argv.slice(2);
    if(args.length!==0&&args.length!==2)throw Error('Usage: node unpack-equipment-revisions.mjs [PACKAGE_DIR PUBLIC_EQUIPMENT_REVISED_DIR]');
    const r=await unpack(...(args.length?args:[join(root,'payloads/equipment-revised'),join(root,'public/equipment-revised')]));
    console.log('Equipment revisions:',r.status,r.files,'files;',r.bytes,'bytes;',r.manifestSha256);
  }catch(e){console.error('Equipment revisions:',e.message);process.exitCode=1;}
}
