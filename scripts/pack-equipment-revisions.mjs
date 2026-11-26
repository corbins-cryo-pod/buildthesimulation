/** Pack exact already-reviewed files. This program does not decide what is publishable. */
import {mkdir, writeFile, rename, rm, mkdtemp} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CHUNK_MAX, FILE_MAX, MANIFEST_MAX, SCHEMA, checkPaths, cmp, digest, forDecodedBlob, isDigest,
  readPayload, readRegular, safeDirectory, validateManifest} from './unpack-equipment-revisions.mjs';

function need(ok,msg){if(!ok)throw Error(msg);}
export async function releasePaths(sourceManifest,allowCandidates=false) {
  const sourcePath=resolve(sourceManifest);
  await safeDirectory(dirname(sourcePath));
  const d=JSON.parse((await readRegular(sourcePath,MANIFEST_MAX,false)).toString('utf8'));
  need(d.schema==='bts.device-web-pack.v1'&&d.pathPrefix==='/equipment-revised/'&&Array.isArray(d.records),'Unexpected source stage manifest schema');
  const records=new Set(), files=[];
  const joinProof=d.browserQaJoin;
  for(const r of d.records) {
    need(r&&typeof r.id==='string'&&/^(?:0[1-9]|1[0-6])-(?:0[1-9]|[1-9][0-9])$/.test(r.id)&&!records.has(r.id),'Duplicate or invalid equipment ID in source');
    records.add(r.id);
    if(r.status!=='ready'&&!(allowCandidates&&r.status==='candidate'))continue;
    need(Array.isArray(r.files)&&typeof r.entry==='string'&&/\.html?$/i.test(r.entry)&&r.files.some(x=>x.target===r.entry),'Selected station is missing an approved HTML entry: '+r.id);
    if(r.status==='ready'){
      const entry=r.files.find(x=>x.target===r.entry);
      const single=joinProof?.idPassRequiresEntrySha===true&&isDigest(joinProof.joinedReportSha256);
      const splitSource=r.browserProof?.treeVariant;
      const fused=joinProof?.idAndEntryShaRequired===true&&['primary','patch'].includes(splitSource)
        &&isDigest(joinProof.inputHashesAndCounts?.[splitSource]?.browserReportSha256)
        &&isDigest(r.browserProof?.dependencyManifestSha256);
      need((single||fused)&&r.browserProof?.outcome==='pass'
        &&r.browserProof.entrySha256===entry.sha256,'Exactly matched independent browser proof required for ready station: '+r.id);
    }
    for(const f of r.files) {
      const bytes=f.bytes??f.sizeBytes;
      need(typeof f.target==='string'&&Number.isSafeInteger(bytes)&&bytes>=0&&bytes<=FILE_MAX&&
        (f.bytes===undefined||f.sizeBytes===undefined||f.bytes===f.sizeBytes)&&isDigest(f.sha256),'Invalid selected stage file for '+r.id);
      files.push({path:r.id+'/'+f.target,sha256:f.sha256,bytes});
    }
  }
  need(files.length>0,'No selected files; a ready-only manifest is required');
  checkPaths(files.map(f=>f.path));
  return files.sort((a,b)=>cmp(a.path,b.path));
}

function members(raw,max=CHUNK_MAX) {
  const gz=gzipSync(raw,{level:9});
  // Normalize the non-semantic mtime/OS gzip bytes for the same zlib across platforms.
  gz.fill(0,4,8);gz[9]=255;
  if(gz.length<=max)return [{compressed:gz,rawBytes:raw.length}];
  const mid=Math.ceil(raw.length/2);
  return [...members(raw.subarray(0,mid),max),...members(raw.subarray(mid),max)];
}

export async function pack(stageDir,sourceManifest,outDir,{allowCandidates=false}={}) {
  const source=await safeDirectory(stageDir);
  const files=await releasePaths(sourceManifest,allowCandidates);
  const output=resolve(outDir), outputParent=await safeDirectory(dirname(output));
  const temp=await mkdtemp(join(outputParent,'.bts-equipment-pack-'));
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
      manifestSha256:digest(text),candidatePreparationOnly:allowCandidates};
  } finally {await rm(temp,{recursive:true,force:true});}
}

export async function verifyApproval(sourceManifest,payloadDirectory) {
  const approved=await releasePaths(sourceManifest);
  const payload=await readPayload(payloadDirectory);
  need(JSON.stringify(approved)===JSON.stringify(payload.manifest.files),'Approved ready release paths or bytes differ from this payload; repack from the ready-only manifest');
  await forDecodedBlob(payload);
  return {files:approved.length,uniqueBlobs:payload.manifest.blobs.length,chunks:payload.manifest.chunks.length,
    decodedBytes:payload.totalBytes,manifestSha256:payload.manifestSha256,approvedExactMatch:true};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const [a,b,c,d,...extra]=process.argv.slice(2);
    if(a==='--verify-only'&&b&&c&&!d)console.log(JSON.stringify(await verifyApproval(b,c)));
    else if(a&&b&&c&&(!d||d==='--allow-candidates')&&!extra.length)console.log(JSON.stringify(await pack(a,b,c,{allowCandidates:!!d})));
    else throw Error('Usage: node pack-equipment-revisions.mjs STAGE_DIR REVIEW_MANIFEST NEW_OUTPUT_DIR [--allow-candidates]\n       node pack-equipment-revisions.mjs --verify-only APPROVED_MANIFEST PAYLOAD_DIR');
  }catch(e){console.error('Equipment revisions:',e.message);process.exitCode=1;}
}
