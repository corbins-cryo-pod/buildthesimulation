/** Strict portable device contract. Geometry cannot imply optical efficiency. */
const DEVICE_SCHEMA='bts-opto-device/1';
function num(v,lo,hi,label){if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error(`${label}: expected ${lo}–${hi}.`);return v;}
function vec(v,label,limit=10000){if(!Array.isArray(v)||v.length!==3)throw Error(label+': expected 3 coordinates.');return v.map(x=>num(x,-limit,limit,label));}
function text(v,label){if(typeof v!=='string'||!v.trim()||v.length>100)throw Error(label+': expected 1–100 characters.');return v;}
function normalizedEmitter(e,i=0){
 if(!e||typeof e!=='object')throw Error('Emitter object required.');
 const normal=vec(e.normal,'Emitter normal',1),length=Math.hypot(...normal);if(length<1e-9)throw Error('Emitter normal cannot be zero.');
 if(typeof e.enabled!=='boolean')throw Error('Emitter enabled must be boolean.');
 return {id:text(e.id??`LED-${i+1}`,'Emitter ID'),enabled:e.enabled,positionUm:vec(e.positionUm,'Emitter position'),normal:normal.map(x=>x/length),
 widthUm:num(e.widthUm,2,500,'Emitter width µm'),heightUm:num(e.heightUm,2,500,'Emitter height µm'),rotationDeg:num(e.rotationDeg??0,-360,360,'Emitter in-plane rotation'),
 powerMw:num(e.powerMw,0,1,'Emitter optical power mW'),wavelengthNm:num(e.wavelengthNm,400,700,'Emitter wavelength nm'),efficiency:num(e.efficiency,.005,1,'Wall-plug efficiency')};
}
function validateDevice(d){
 if(!d||d.schema!==DEVICE_SCHEMA||d.units!=='um')throw Error('Expected bts-opto-device/1 with units="um".');
 if(!Array.isArray(d.emitters)||d.emitters.length>16)throw Error('Device must have 0–16 emitters.');
 const emitters=d.emitters.map(normalizedEmitter);if(new Set(emitters.map(x=>x.id)).size!==emitters.length)throw Error('Emitter IDs must be unique.');
 const contacts=(d.contacts??[]).map((c,i)=>({id:text(c.id??`E${i+1}`,'Contact ID'),positionUm:vec(c.positionUm,'Contact position'),widthUm:num(c.widthUm,1,10000,'Contact width'),heightUm:num(c.heightUm,1,10000,'Contact height'),shape:['circle','square','rectangle','ellipse','ring'].includes(c.shape)?c.shape:'rectangle',rotationDeg:num(c.rotationDeg??0,-360,360,'Contact rotation')}));
 if(contacts.length>256||new Set(contacts.map(c=>c.id)).size!==contacts.length)throw Error('At most 256 unique contacts allowed.');
 const metadata=d.metadata&&typeof d.metadata==='object'?JSON.parse(JSON.stringify(d.metadata)):{};
 if(JSON.stringify(metadata).length>120000)throw Error('Device metadata exceeds 120 kB.');
 return {schema:DEVICE_SCHEMA,units:'um',name:text(d.name??'Optoelectrode','Device name'),emitters,contacts,metadata};
}
function makeLedArray(count=3,pitchUm=100,powerMw=.02,wavelengthNm=470){
 return validateDevice({schema:DEVICE_SCHEMA,units:'um',name:'Three-site optical shank · assumed device',emitters:Array.from({length:count},(_,i)=>({id:`LED-${i+1}`,enabled:true,positionUm:[-70,(i-(count-1)/2)*pitchUm,0],normal:[1,0,0],widthUm:22,heightUm:22,powerMw,wavelengthNm,efficiency:.065})),contacts:[]});
}
function parseImport(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Expected a JSON object.');
 if(input.schema===DEVICE_SCHEMA)return {kind:'device',device:validateDevice(input),warnings:[]};
 if(input.schema==='bts-neural-interface'&&input.version===1){
  if(!['um','µm'].includes(input.units))throw Error('Designer coordinates require explicit um or µm units.');
  if(!Array.isArray(input.contacts)||input.contacts.length>256)throw Error('Import up to 256 designer contacts.');
  const contacts=input.contacts.map((c,i)=>({id:text(c.id??`E${i+1}`,'Contact ID'),positionUm:[num(c.x,-10000,10000,'x'),num(c.y,-10000,10000,'y'),0],widthUm:num(c.w,1,10000,'w'),heightUm:num(['circle','square','ring'].includes(c.shape)?c.w:c.h,1,10000,'h'),shape:c.shape,rotationDeg:num(c.rotation??0,-360,360,'rotation')}));
  return {kind:'designer',device:validateDevice({schema:DEVICE_SCHEMA,units:'um',name:input.name??'Designer layout',emitters:[],contacts,metadata:{sourceSchema:input.schema,sourceVersion:1,routing:input.routing??{},original:input}}),warnings:['All sites remain electrodes. Select specific sites and explicitly convert them to assumed microLED emitters. The original design is retained.','Planar x/y coordinates retained at z=0 µm; units are never guessed. Contacts are visual only; no electrode recording or electrical circuit is inferred.']};
 }
 if(input.schema==='microfabrication-1'&&input.config&&typeof input.config==='object'&&!Array.isArray(input.config)){
  return {kind:'recipe',recipe:JSON.parse(JSON.stringify(input)),warnings:['Recipe archived as provenance only. It has no measured emitter efficiency, wavelength, or optical output; thermal material properties and electrical continuity are not inferred. Use an explicit optoelectrode file for simulated geometry.']};
 }
 throw Error('Unsupported import. Use bts-opto-device/1, bts-neural-interface version 1, or a Microfabrication Laboratory recipe.');
}
function convertContacts(device,ids,settings){
 const d=validateDevice(device),wanted=new Set(ids);
 if(!wanted.size)throw Error('Select one or more contacts explicitly.');
 if([...wanted].some(id=>!d.contacts.some(c=>c.id===id)))throw Error('Unknown selected contact.');
 const additions=d.contacts.filter(c=>wanted.has(c.id)).map(c=>normalizedEmitter({id:'optical-'+c.id,enabled:true,positionUm:[c.positionUm[0],c.positionUm[1],settings.zUm??-75],normal:[0,0,1],widthUm:c.widthUm,heightUm:c.heightUm,rotationDeg:c.rotationDeg,powerMw:settings.powerMw,wavelengthNm:settings.wavelengthNm,efficiency:settings.efficiency}));
 return validateDevice({...d,emitters:[...d.emitters,...additions],metadata:{...d.metadata,conversion:{selectedContactIds:[...wanted],settings,assumption:'Selected electrode footprints repurposed as rectangular Lambertian emitters, not evidence of a fabricated LED.'}}});
}
export {DEVICE_SCHEMA,num,vec,normalizedEmitter,validateDevice,makeLedArray,parseImport,convertContacts};
