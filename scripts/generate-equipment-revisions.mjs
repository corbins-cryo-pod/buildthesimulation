/** Build public metadata from the reviewed private ledger and optional prepared website asset manifest. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {revisionKind} from '../src/data/equipment-revisions-scope.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'src/data/equipment-revisions.generated.json');
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
function safeString(x,label){
 if(typeof x!=='string'||!x.trim()||/[\u0000-\u001f]/u.test(x)||/(?:sandbox:|file:\/{2}|\/workspace\/|libraryFileId)/u.test(x))
  throw Error('Cannot use invalid or private text in '+label);
 return x.trim();
}
export function entryParts(value){
 return typeof value==='string'&&/\.html?$/i.test(value)&&!/[\\:?#%\u0000-\u001f]/u.test(value)&&!value.startsWith('/')&&value.split('/').every(s=>!!s&&!['.','..'].includes(s))?value.split('/'):null;
}
const list=async()=>{
 const records=(await Promise.all(Array.from({length:16},(_,i)=>load(resolve(root,'src/data/equipment/zones/'+String(i+1).padStart(2,'0')+'.json'))))).flat();
 if(records.length!==199||new Set(records.map(r=>r.id)).size!==199)throw Error('Expected the 199 stable registered IDs.');
 return records;
};
export async function buildPublicMetadata(ledgerFile,packageFile=null,assetsRoot=resolve(root,'public/equipment-revised')){
 const ledger=(await load(ledgerFile));
 if(ledger.schema!=='bts.phase2.ledger.v1')throw Error('Unrecognized revision ledger schema.');
 const packages=packageFile?await load(packageFile):null;
 if(packages&&packages.schema!=='bts.device-web-pack.v1')throw Error('Unrecognized browser-pack manifest schema.');
 if(packages?.pathPrefix&&packages.pathPrefix!=='/equipment-revised/')throw Error('Unexpected browser-pack prefix.');
 const packageRows=packages?.records??{};
 const byId=Array.isArray(packageRows)?Object.fromEntries(packageRows.map(p=>[p.id,p])):packageRows;
 if(Array.isArray(packageRows)&&Object.keys(byId).length!==packageRows.length)throw Error('Duplicate browser pack ID.');
 const records=await list(), ids=new Set(records.map(r=>r.id));
 if(records.length!==Object.keys(ledger.records).length||Object.keys(ledger.records).some(id=>!ids.has(id)))throw Error('The reviewed ledger does not contain exactly the 199 registered IDs.');
 if(Object.keys(byId).some(id=>!ids.has(id)))throw Error('Browser pack has an unknown equipment ID.');
 const rows=[];
 for(const r of records){
  const src=ledger.records[r.id], pack=byId[r.id];
  if(src.phase2!=='first bounded operator pass verified'||!Array.isArray(src.evidence)||!src.evidence.length)throw Error('Missing reviewed scope/evidence for '+r.id);
  let status='pending',entry=null,sha256=null;
  if(pack?.status==='ready'){
   const segments=entryParts(pack.entry);
   const member=segments&&pack.files?.find(f=>f.target===pack.entry);
   if(!member||!Number.isSafeInteger(member.sizeBytes)||member.sizeBytes<=0||!/^[a-f0-9]{64}$/.test(member.sha256))throw Error('No verified HTML entry asset for '+r.id);
   const path='/equipment-revised/'+r.id+'/'+segments.map(encodeURIComponent).join('/');
   if(pack.entryPath!==undefined&&pack.entryPath!==path)throw Error('Browser pack URL does not match exact asset for '+r.id);
   const dest=resolve(assetsRoot,r.id,...segments);
   if(relative(resolve(assetsRoot,r.id),dest).startsWith('..'+sep))throw Error('Entry escapes per-instrument asset location');
   const bytes=await readFile(dest);
   if(bytes.length!==member.sizeBytes||sha(bytes)!==member.sha256)throw Error('Staged entry does not match manifest for '+r.id);
   status='ready';entry=pack.entry;sha256=member.sha256;
  }else if(pack?.status==='blocked'){status='blocked';}
  rows.push({id:r.id,kind:revisionKind(r.id),scope:safeString(src.scope,r.id),evidence:src.evidence.map((e,i)=>safeString(e,r.id+' evidence '+i)),status,entry,sha256});
 }
 return {schema:'bts.equipment-revisions.public.v1',records:rows};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [ledger,packages,assets]=process.argv.slice(2);
 if(!ledger)throw Error('Usage: node scripts/generate-equipment-revisions.mjs LEDGER_PATH [PACK_MANIFEST] [ASSET_ROOT]');
 const data=await buildPublicMetadata(ledger,packages||null,assets);
 await writeFile(output,JSON.stringify(data,null,2)+'\n');
 console.log('Public revision catalogue:',data.records.length,'reviewed rows;',data.records.filter(r=>r.status==='ready').length,'ready to open.');
}
