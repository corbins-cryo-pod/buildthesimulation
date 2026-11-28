const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),H=require('./engine.cjs');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../../../public/simulations/foundry/process-handoff/index.html'),'utf8'),g=html.match(/<script id="handoff-data" type="application\/json">([\s\S]*?)<\/script>/);
const db=JSON.parse(g[1]);
const {cases,demands,prove}=H,M='match',X='incompatible',U='unknown';
const all={
 carrier:[[X,U,X],[U,U,X],[X,X,X]],
 panel:[[U,X],[X,X],[X,U],[U,X],[U,M]],
 develop:[[X],[M],[X]],
 placement:[[X,X,X],[M,X,X]],
 seal:[[M,X,X],[X,M,X]],
 record:[[X,M,X],[M,X,U],[X,X,X]]
};
const pairs=new Map();let count=0;
for(const c of cases){
 assert(c.artifactIds.length&&c.demandIds.length);assert(c.profiles.every(p=>db.profiles[p]));
 for(const [ai,a] of c.artifactIds.entries())for(const [di,d] of c.demandIds.entries()){
  const receipt=prove(db,c.id,a,d);
  assert.equal(receipt.valid,true);
  assert.equal(receipt.status,all[c.id][ai][di],c.id+'/'+a+'/'+d);
  assert.equal(receipt.mode,'digital-only');assert.equal(receipt.gates.some(x=>x.status===X),receipt.status===X);
  assert.equal(receipt.gates.every(x=>x.status===M),receipt.status===M);
  assert.equal(receipt.notImplied.length,4);
  for(const gate of receipt.gates){
   assert(gate.gate&&gate.reason&&gate.sources.length&&gate.sources.every(k=>db.evidence[k]));
  }
  const keyed=c.id+'/'+a+'/'+d;pairs.set(keyed,receipt);
  count++;
 }
}
const proof=(c,a,d,gate,status)=>{
 const got=pairs.get(c+'/'+a+'/'+d).gates.find(g=>g.gate===gate);
 assert.equal(got?.status,status,gate);
};
proof('carrier','dry200','drie','Selected diameter',X);
proof('carrier','custody150','drie','Selected diameter',M);
proof('carrier','custody150','drie','Stack and receiving record',U);
proof('carrier','dry200','saw-fit','Mounting carrier',U);
proof('carrier','poster','saw-fit','Artifact role',X);
proof('panel','smallRegion','reference-field','Standard written field',M);
proof('panel','smallRegion','reference-field','Installed holder',U);
proof('panel','smallRegion','local-window','Virtual specimen',X);
proof('panel','wholePanel','reference-field','Standard written field',X);
proof('panel','narrowSpace','reference-field','Dense spacing',X);
proof('panel','narrowSpace','reference-field','Dense line width',M);
proof('panel','boundary','reference-field','Standard written field',M);
proof('panel','tinyRegion','local-window','Local two-stripe extent',M);
proof('develop','direct','developer','Input schema',X);
proof('develop','rename','developer','Input schema',M);
proof('develop','rename','developer','Required specimen',X);
proof('placement','placed5','attachment','Tracked geometry',M);
proof('placement','placed5','attachment','Material state',X);
proof('seal','leak','named-package','Package lineage',X);
proof('seal','leak','named-package','Measurement class',X);
proof('seal','seam','named-package','Package design identity',M);
proof('record','wiregraph','adc','No voltage or time base',X);
proof('record','volts','recording','End-to-end mapping',U);
proof('record','wrongUnit','adc','Input schema',M);
proof('record','wrongUnit','adc','Voltage units',X);
const {developer,adc}=db.proofs;
assert.equal(developer.outputRevision,developer.inputRevision+1);assert.equal(developer.id,db.records.contact.fields.id);assert.equal(developer.points,6400);assert(developer.openCells>0);
assert.equal(adc.outputRevision,adc.inputRevision+1);assert.equal(adc.id,db.records.volts.fields.id);assert.equal(adc.points,131);assert.equal(adc.terminal,'AI0');
assert.equal(prove(db,'carrier','contact','drie').status,U);assert.equal(prove(db,'invented','dry200','drie').status,U);assert.equal(prove(db,'panel','tinyRegion','invented').valid,false);
const dict=fs.readFileSync(process.argv[3]||path.join(__dirname,'../../../../src/data/foundry-atlas/lanes/equipment.json'));assert.equal(crypto.createHash('sha256').update(dict).digest('hex'),db.dictionary.sha256);
for(const r of Object.values(db.records)){assert.match(r.recordSha256,/^[a-f0-9]{64}$/);assert(r.sources.every(k=>db.evidence[k]));}
for(const d of Object.values(demands)){assert(db.equipment[d.station]||d.station==='external');assert(d.sources.every(k=>db.evidence[k]));}
console.log(JSON.stringify({result:'pass',pairs:count,cases:cases.length,distinctDemands:Object.keys(demands).length,softwareWitnesses:{developer,adc}},null,2));
