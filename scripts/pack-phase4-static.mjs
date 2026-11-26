/** Pack exact already-reviewed files. This program does not decide what is publishable. */
import {lstat, mkdir, readdir, writeFile, rename, rm, mkdtemp} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CHUNK_MAX, COUNT_MAX, FILE_MAX, MANIFEST_MAX, SCHEMA, APPROVAL_SCHEMA, REQUIRED, ROOTS, checkPaths, cmp, digest, forDecodedBlob, isDigest,
  readPayload, readRegular, safeDirectory, validateManifest, safeRelative, publicRoots, exactCase} from './unpack-phase4-static.mjs';

function need(ok,msg){if(!ok)throw Error(msg);}
export async function releasePaths(sourceManifest) {
  const sourcePath=resolve(sourceManifest);
  await safeDirectory(dirname(sourcePath));
  const d=JSON.parse((await readRegular(sourcePath,MANIFEST_MAX,false)).toString('utf8'));
  need(d&&Object.keys(d).length===2&&d.schema===APPROVAL_SCHEMA&&Array.isArray(d.files)&&d.files.length>=2&&d.files.length<=COUNT_MAX,'Unexpected Phase 4 approved-byte manifest schema');
  const files=d.files.map(f=>{
    need(f&&Object.keys(f).length===3&&typeof f.path==='string'&&Number.isSafeInteger(f.bytes)&&f.bytes>=0&&f.bytes<=FILE_MAX&&isDigest(f.sha256),'Invalid approved staging file row');
    return {path:f.path,sha256:f.sha256,bytes:f.bytes};
  });
  checkPaths(files.map(f=>f.path));publicRoots(files.map(f=>f.path));
  return files.sort((a,b)=>cmp(a.path,b.path));
}

export async function inventory(stageDir,{hashes=true}={}){
  const base=await safeDirectory(stageDir),files=[];
  async function walk(dir,prefix) {
    await safeDirectory(dir);
    for(const name of (await readdir(dir)).sort(cmp)){
      const path=prefix+'/'+name, child=join(dir,name);
      need(safeRelative(path),'Unsafe staging path: '+JSON.stringify(path));
      const st=await lstat(child);
      need(!st.isSymbolicLink(),'Symlink forbidden in staging: '+path);
      if(st.isDirectory())await walk(child,path);
      else{
        need(st.isFile()&&st.size<=FILE_MAX,'Non-regular or oversized static file: '+path);
        const total=files.length+1;need(total<=COUNT_MAX,'Too many static files');
        const bytes=st.size, sha256=hashes?digest(await readRegular(child,bytes)):undefined;
        files.push({path,sha256,bytes});
      }
    }
  }
  for(const root of ROOTS){
    let cur=base;
    for(const name of root.split('/')){
      if(!await exactCase(cur,name)){cur=null;break;}
      cur=join(cur,name);await safeDirectory(cur);
    }
    if(cur)await walk(cur,root);
    else need(!REQUIRED.includes(root),'Mandatory stage subtree missing: '+root);
  }
  checkPaths(files.map(f=>f.path));publicRoots(files.map(f=>f.path));
  files.sort((a,b)=>cmp(a.path,b.path));
  return {schema:APPROVAL_SCHEMA,files};
}

function members(raw,max=CHUNK_MAX) {
  const gz=gzipSync(raw,{level:9});
  // Normalize the non-semantic mtime/OS gzip bytes for the same zlib across platforms.
  gz.fill(0,4,8);gz[9]=255;
  if(gz.length<=max)return [{compressed:gz,rawBytes:raw.length}];
  need(raw.length>1,'Compression member cannot fit into configured ceiling');
  const mid=Math.ceil(raw.length/2);
  return [...members(raw.subarray(0,mid),max),...members(raw.subarray(mid),max)];
}

export async function pack(stageDir,sourceManifest,outDir) {
  const source=await safeDirectory(stageDir);
  const files=await releasePaths(sourceManifest);
  const planned=(await inventory(source,{hashes:false})).files;
  need(planned.length===files.length&&files.every((e,i)=>e.path===planned[i].path&&e.bytes===planned[i].bytes),'Staging paths or lengths differ from the explicit approved manifest');
  const output=resolve(outDir), outputParent=await safeDirectory(dirname(output));
  need(output!==source&&!output.startsWith(source+'/')&&!source.startsWith(output+'/'),'Payload directory must be separate from staging');
  const temp=await mkdtemp(join(outputParent,'.bts-phase4-pack-'));
  try {
    const unique=new Map();
    for(const f of files){
      await safeDirectory(dirname(join(source,f.path)));
      const bytes=await readRegular(join(source,f.path),f.bytes);
      need(digest(bytes)===f.sha256,'Stage hash does not match: '+f.path);
      if(!unique.has(f.sha256))unique.set(f.sha256,{sha256:f.sha256,bytes:f.bytes,parts:members(bytes)});
    }
    const blobs=[...unique.values()].sort((a,b)=>cmp(a.sha256,b.sha256));
    const items=blobs.flatMap(b=>b.parts.map((r,i)=>({key:b.sha256,index:i,ref:r})));
    items.sort((a,b)=>b.ref.compressed.length-a.ref.compressed.length||cmp(a.key,b.key)||a.index-b.index);
    const bins=[];
    for(const {ref:r} of items) {
      const n=r.compressed.length;
      const i=bins.findIndex(bin=>bin.bytes+n<=CHUNK_MAX);
      if(i<0)bins.push({bytes:0,parts:[]});
      const index=i<0?bins.length-1:i, bin=bins[index];
      r.where={chunk:index,offset:bin.bytes,bytes:n,rawBytes:r.rawBytes};
      bin.bytes+=n;bin.parts.push(r.compressed);
    }
    const m={schema:SCHEMA,chunkMaxBytes:CHUNK_MAX,chunks:[],blobs:blobs.map(b=>({...b,parts:b.parts.map(p=>p.where)})),files};
    for(const [i,bin] of bins.entries()){
      const buf=Buffer.concat(bin.parts,bin.bytes), file='chunk-'+String(i).padStart(3,'0')+'.bin';
      const row={file,bytes:buf.length,sha256:digest(buf)};
      m.chunks.push(row);
      await writeFile(join(temp,file),buf,{flag:'wx',mode:0o644});
    }
    validateManifest(m);
    const text=JSON.stringify(m)+'\n';
    need(Buffer.byteLength(text)<=MANIFEST_MAX,'Payload manifest is too large');
    await writeFile(join(temp,'manifest.json'),text,{flag:'wx',mode:0o644});
    // Prevent replacing an existing payload: only new output names are accepted.
    await mkdir(output);
    try {
      for(const c of m.chunks)await rename(join(temp,c.file),join(output,c.file));
      await rename(join(temp,'manifest.json'),join(output,'manifest.json'));
    }catch(e){await rm(output,{recursive:true,force:true});throw e;}
    return {files:files.length,uniqueBlobs:blobs.length,chunks:bins.length,
      bytes:m.chunks.reduce((n,c)=>n+c.bytes,0),decodedBytes:files.reduce((n,f)=>n+f.bytes,0),
      manifestSha256:digest(text),roots:publicRoots(files.map(f=>f.path))};
  } finally {await rm(temp,{recursive:true,force:true});}
}

export async function verifyApproval(sourceManifest,payloadDirectory) {
  const approved=await releasePaths(sourceManifest);
  const payload=await readPayload(payloadDirectory);
  need(JSON.stringify(approved)===JSON.stringify(payload.manifest.files),'Approved static paths or bytes differ from this payload');
  await forDecodedBlob(payload);
  return {files:approved.length,uniqueBlobs:payload.manifest.blobs.length,chunks:payload.manifest.chunks.length,
    decodedBytes:payload.totalBytes,manifestSha256:payload.manifestSha256,approvedExactMatch:true};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const args=process.argv.slice(2);
    if(args.length===2&&args[0]==='--inventory')console.log(JSON.stringify(await inventory(args[1])));
    else if(args.length===3&&args[0]==='--verify-only')console.log(JSON.stringify(await verifyApproval(args[1],args[2])));
    else if(args.length===3&&!args[0].startsWith('--'))console.log(JSON.stringify(await pack(...args)));
    else throw Error(`Usage: node pack-phase4-static.mjs --inventory STAGE_PUBLIC
       node pack-phase4-static.mjs STAGE_PUBLIC APPROVED_JSON NEW_PAYLOAD_DIR
       node pack-phase4-static.mjs --verify-only APPROVED_JSON PAYLOAD_DIR`);
  }catch(e){console.error('Phase 4 static:',e.message);process.exitCode=1;}
}
