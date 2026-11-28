/* Pure, hardware-disconnected model. No vendor tables or biological data are emitted. */
(function(host){
'use strict';
const source={
 family:['Neuropixels Central · family comparison','https://www.neuropixelscentral.org/technology','Probe family, available recording configurations and prototype boundaries.'],
 np1:['Jun et al. · Neuropixels 1.0','https://pmc.ncbi.nlm.nih.gov/articles/PMC5955206/','Physical sites and concurrent recording channels are different quantities.'],
 wiring:['Cortex Lab · selecting sites and banks','https://github.com/cortex-lab/neuropixels/wiki/Selecting-recording-electrodes','The original single-shank 1.0 probe shares a line across corresponding positions in successive 384-site banks.'],
 np2:['Steinmetz et al. · Neuropixels 2.0','https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/','Figure 5 and accompanying text: single-shank block alignment, same-depth four-shank selections and diagonal stripes.'],
 ultra:['Ye et al. · Ultra recording patterns','https://doi.org/10.1016/j.neuron.2025.08.030','Figures 1 and S1 distinguish four rectangular sampling configurations on the 6,144-site version.'],
 nhp:['Trautmann et al. · long-shank Neuropixels','https://pmc.ncbi.nlm.nih.gov/articles/PMC12229894/','The 45 mm study device, and comparison with the medium-length version, must not be scaled from the rodent footprint.'],
 quad:['imec · Quad Base specifications','https://www.neuropixels.org/probe2-0-qb-multi-shank','Four shanks, each with a dedicated 384-channel readout section.'],
 nxt:['Neuropixels Central · NXT/3.0 prototype','https://www.neuropixelscentral.org/post/neuropixels-nxt-3-0-probe-access-challenge-pac','Access-program report is separate from the evidence for a released production revision.'],
 imro:['SpikeGLX · IMRO formats','https://billkarsh.github.io/SpikeGLX/help/imroTables/','Published formats distinguish 1.0, 2.0, Ultra, Quad Base and NP3020. The latter uses shank, bank and site fields; this bench is not an IMRO generator.'],
 opto:['Lakunina et al. · Neuropixels Opto','https://doi.org/10.1038/s41592-026-03076-z','Electrical channels and independently selected grating emitters are different paths. Measurements distinguish blue and red.']
};
const profiles={
 np1:{name:'1.0 · standard shank',short:'1.0',spec:'Three site banks, shared readout',n:1,sites:960,total:384,per:384,ref:'si-np1',sources:['np1','wiring','imro'],text:'960 nominal sites feed 384 electrical lines. For the original 1.0 bank addressing, sites 0, 384 and 768 all compete for line 0. This test represents nominal routing; reference sites are not ordinary independent neural inputs.'},
 np2s:{name:'2.0 alpha · single shank',short:'2.0 single',spec:'32-site alignment, scrambled within blocks',n:1,sites:1280,total:384,per:384,ref:'si-np2',sources:['np2','imro'],text:'A contiguous 384-site window can start at any multiple of 32 that fits. Within each 32-site block the physical-to-channel order is scrambled; drawn site addresses are not the ADC order.'},
 np2m:{name:'2.0 alpha · four shanks',short:'2.0 four',spec:'Four shanks share one 384-channel pool',n:4,sites:1280,total:384,per:384,ref:'si-np2',sources:['np2','imro'],text:'The alpha device shares 384 readouts across all four shanks. The paper describes one-shank, four same-depth ribbons and four diagonal ribbons. The presets below show representative layouts rather than every valid selection.'},
 ultra:{name:'Ultra · 6,144-site study probe',short:'Ultra',spec:'More columns trade off against axial span',n:1,sites:6144,total:384,per:384,ref:'si-np-ultra',sources:['ultra','family','imro'],text:'All four published rectangular patterns select 384 nominal sites from an eight-column, 6 µm-pitch array. Their axial coverage differs. This is the published 6,144-site study version, not an earlier fixed array.'},
 nhp25:{name:'NHP · 25 mm shank',short:'NHP 25',spec:'2,496 nominal contacts, 384 readouts',n:1,sites:2496,total:384,per:384,ref:'si-np-nhp',sources:['nhp','family'],text:'The medium-length hardware has 2,496 selectable sites. A count check here does not establish which arbitrary 384 positions route together on the physical device.'},
 nhp45:{name:'NHP · 45 mm shank',short:'NHP 45',spec:'Long stitched die, still 384 readouts',n:1,sites:4416,total:384,per:384,ref:'si-np-nhp',sources:['nhp','family'],text:'The 45 mm version has 4,416 sites and depends on reticle stitching and a long, reinforced shank. A longer die increases reach and site count, not the 384-channel readout capacity.'},
 quad:{name:'2.0 · Quad Base',short:'Quad Base',spec:'Four fixed pools of 384',n:4,sites:1280,total:1536,per:384,ref:'si-np-quad',sources:['quad','imro'],text:'Each of four shanks has its own 384-channel budget. Extra capacity on shank 3 cannot rescue 385 requested on shank 0. The model checks these fixed boundaries, not the full site switch table.'},
 nxt:{name:'NXT / 3.0 · four-shank prototype',short:'NXT prototype',spec:'Up to 912 concentrated on one shank',n:4,sites:null,total:1536,per:912,ref:'si-np-nxt',sources:['family','nxt','imro'],text:'The prototype program reports 1,536 readouts and up to 912 on one shank. NP3020 software describes 1,280 within-shank site addresses, but a format is not validation of a particular prototype and firmware. A bounded request here is never certified routable.'},
 opto:{name:'Opto · electrical plus photonic paths',short:'Opto',spec:'384 electrical readouts, 2 × 14 optical emitters',n:1,sites:960,total:384,per:384,ref:'si-np-opto',sources:['opto','np1'],text:'The 960-site electrical array and 384-channel readout are separate from 14 blue and 14 red emitter positions. Choosing an emitter changes the optical address, not the electrical channel capacity.'}
};
const preset={
 np1:[['b0','Bank 0 · 0–383'],['b1','Bank 1 · 384–767'],['b2','Upper half-bank · 768–959'],['manual','Custom site IDs / inclusive ranges'],['collision','Counterexample · sites 0 and 384']],
 np2s:[['window','Aligned 384-site window'],['offset1','Unaligned window · test evidence limit']],
 np2m:[['flat','Four ribbons at the same depth'],['diag','Diagonal · 96-site offset per shank'],['one','384-site window on one shank']],
 ultra:[['u8','48 rows × 8 columns'],['u4','96 rows × 4 columns'],['u2','192 rows × 2 columns'],['u1','384 rows × 1 column']],
 nhp25:[['capacity','384 active slots · budget only']],nhp45:[['capacity','384 active slots · budget only']],
 quad:[['fixed','Full balanced banks · 384 each'],['oneOver','Counterexample · 385 on one shank']],
 nxt:[['balanced','Balanced request · 384 each'],['dense','Concentrated request · 912 + 3 × 208'],['oneOver','Counterexample · 913 on one shank']],
 opto:[['color','Electrical budget + optical address']]
};
for(const k of Object.keys(preset))preset[k].push(['counts','Custom counts · budget only']);
const whole=x=>Number.isSafeInteger(x)&&x>=0, axis=['S0','S1','S2','S3'];
function parseSites(input){
 let s=String(input??'').trim();if(!s)return {error:'Enter one or more zero-based physical site IDs.'};
 if(s.length>7000)return {error:'Site expression is too long.'};
 const ids=[],seen=new Set();
 for(const token of s.split(/[,\s]+/)){
  const m=/^(\d{1,4})(?:-(\d{1,4}))?$/.exec(token);if(!m)return {error:'Use whole site IDs or inclusive ranges, such as 0–31 written as 0-31.'};
  let lo=Number(m[1]),hi=m[2]?Number(m[2]):lo;
  if(lo>hi||hi>959)return {error:'A 1.0 site range must run forward and stay between 0 and 959.'};
  for(let i=lo;i<=hi;i++){if(seen.has(i))return {error:'Site '+i+' was requested more than once.'};seen.add(i);ids.push(i);}
 }
 return {ids};
}
function result(key,mode,code,why,counts,groups=[],extras={}){
 const m=profiles[key];return {version:1,key,mode,code,why,counts,groups,n:m.n,total:m.total,per:m.per,requested:counts.reduce((a,b)=>a+(whole(b)?b:0),0),...extras};
}
function evaluate(key,mode,o={}){
 const m=profiles[key];
 if(!m||!preset[key].some(p=>p[0]===mode))return {code:'invalid',why:'Unknown instrument or preset.',counts:[],groups:[],requested:0};
 const g=[],c=Array(m.n).fill(0);let next=0,acq='bounds',why='Counts respect the published capacity, but physical site and switch identities are not tested.',withoutSite=false;
 let extras={};const reject=(msg,cc=c)=>result(key,mode,'invalid',msg,cc);
 function push(sh,site,lane=null){g.push({sh,site,lane:lane??next,hardwareLane:lane!==null,local:c[sh]});c[sh]++;next++;}
 function fill(n,sh=0,start=null){for(let i=0;i<n;i++)push(sh,start===null?null:start+i);}
 function totals(v,success='bounds',note){
  if(!Array.isArray(v)||v.length!==m.n||v.some(x=>!whole(x)))return reject('Each shank needs a nonnegative whole-number count.');
  const req=v.reduce((a,b)=>a+b,0);
  if(req===0)return reject('Select at least one line to run a nonempty test.',v);
  const local=v.findIndex(x=>x>m.per);
  if(local!==-1)return reject(axis[local]+' asks for '+v[local]+' but its published ceiling is '+m.per+'.'+(req>m.total?' The total also exceeds '+m.total+'.':''),v);
  if(req>m.total)return reject('The shanks together request '+req+' lines; only '+m.total+' are available.',v);
  for(let i=0;i<v.length;i++)fill(v[i],i);
  return result(key,mode,success,note||why,c,g,{withoutSite:true});
 }
 if(mode==='counts')return totals(o.counts);
 if(key==='np1'){
  let ids=mode==='manual'?parseSites(o.sites):mode==='collision'?{ids:[0,384]}:{ids:Array.from({length:mode==='b2'?192:384},(_,i)=>i+(mode==='b2'?768:mode==='b1'?384:0))};
  if(ids.error)return reject(ids.error);
  let assigned=new Map();for(const id of ids.ids){let lane=id%384;if(assigned.has(lane))return reject('Sites '+assigned.get(lane)+' and '+id+' both need line '+lane+'. One 1.0 readout cannot distinguish both at once.',[ids.ids.length]);assigned.set(lane,id);push(0,id,lane);}
  why='The selected zero-based 1.0 sites use distinct nominal lines (site ID modulo 384). Reference selection, disabled inputs and analog performance are outside this check.';acq='address';
 }else if(key==='np2s'){
  let start=mode==='offset1'?1:o.start??0;
  if(!whole(start)||start>896)return reject('A 384-site window must fit inside sites 0–1,279; the largest possible start is 896.');
  fill(384,0,start);extras.start=start;acq=start%32===0?'pattern':'bounds';
  why=acq==='pattern'?'The paper supports 384 consecutive sites starting at a multiple of 32. Displayed slot ordering is illustrative, not the scrambled ADC map.':'Counts fit, but this window misses the documented 32-site alignment guarantee. Absence of a guarantee is not a proof of impossible wiring.';
 }else if(key==='np2m'){
  let sh=o.shank??0;if(!whole(sh)||sh>=4)return reject('Select one of the four shanks (0–3).');
  if(mode==='one')fill(384,sh,0);else for(let i=0;i<4;i++)fill(96,i,mode==='diag'?96*i:0);
  acq='pattern';why='This is a representative arrangement described for the four-shank alpha probe. Site blocks are shown; fixture slots are not the true per-ADC permutation.';
 }else if(key==='ultra'){
  const cols=Number(mode.slice(1)),rows=384/cols;fill(384);withoutSite=true;
  extras={cols,rows,pitch:6,centerSpan:(rows-1)*6,edgeSpan:(rows-1)*6+5};acq='pattern';
  why='Published shape, not a complete per-site switch map. Spans below refer to selected contact centers and 5 µm contact edges; the nominal row pitch is 6 µm.';
 }else if(key==='quad'){
  return totals(mode==='oneOver'?[385,383,384,384]:[384,384,384,384],'capacity','Four independent 384-channel banks are documented. This confirms the partition, not a particular list of 5,120 physical sites.');
 }else if(key==='nxt'){
  return totals(mode==='dense'?[912,208,208,208]:mode==='oneOver'?[913,207,208,208]:[384,384,384,384],'bounds','This allocation clears the 1,536 total and 912-per-shank upper bounds. The exact set must still be checked against revision-specific site routing.');
 }else if(key==='opto'){
  const wl=o.wavelength??450,emit=o.emitter??0;
  if(![450,638].includes(wl)||!whole(emit)||emit>13)return reject('Select a documented wavelength (450 or 638 nm) and emitter index 0–13.');
  extras={wavelength:wl,emitter:emit};withoutSite=true;fill(384);acq='capacity';why='The emitter index and color belong to a separate optical path. This bench neither adds these emitters to the readout count nor estimates irradiance or tissue response.';
 }else{return totals([384],'capacity','The documented capacity is 384 across this shank. The bench has not applied an address-to-ADC switch table for the selected NHP hardware.');}
 return result(key,mode,acq,why,c,g,{withoutSite,...extras});
}
function tags(ev,f={}){
 if(!ev||ev.code==='invalid')return {error:'No loopback runs on a rejected request.',rows:[]};
 const kind=f.kind??'none',n=f.num??0,sh=f.shank??0;
 if(!['none','site','lane','shank','common','swap'].includes(kind))return {error:'Unknown fault type.',rows:[]};
 if(!whole(n)||!whole(sh)||sh>=ev.n)return {error:'Use a nonnegative whole address and an available shank.',rows:[]};
 if(kind==='site'&&(ev.withoutSite||ev.groups.every(x=>x.site===null)))return {error:'Site addresses are unspecified in this mode. Test a fixture slot, shank, or link instead.',rows:[]};
 if(kind==='site'&&profiles[ev.key].sites!==null&&n>=profiles[ev.key].sites)return {error:'The physical site is outside the modeled shank.',rows:[]};
 if(kind==='lane'&&n>=ev.total)return {error:'The lane is outside the modeled output capacity.',rows:[]};
 if(kind==='swap'&&ev.groups.length<2)return {error:'Two active fixture outputs are needed for a swapped pair.',rows:[]};
 const rows=ev.groups.map(rec=>{
  const id=rec.site===null?100000+8192*rec.sh+rec.local:1+8192*rec.sh+rec.site;
  const lost=kind==='common'||(kind==='shank'&&rec.sh===sh)||(kind==='site'&&rec.sh===sh&&rec.site===n)||(kind==='lane'&&rec.lane===n);
  return {...rec,expected:id,observed:lost?null:id};
 });
 if(kind==='swap'){[rows[0].observed,rows[1].observed]=[rows[1].observed,rows[0].observed];}
 const missing=rows.filter(r=>r.observed===null).length,wrong=rows.filter(r=>r.observed!==null&&r.expected!==r.observed).length;
 return {rows,correct:rows.length-missing-wrong,missing,wrong,received:rows.length-missing,kind,shank:sh,num:n};
}
const api={profiles,preset,source,parseSites,evaluate,tags};if(typeof module!=='undefined'&&module.exports)module.exports=api;else host.NPBench=api;
})(typeof globalThis==='object'?globalThis:this);
