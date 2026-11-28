(function(){
'use strict';
const $=id=>document.getElementById(id), data=JSON.parse($('handoff-data').textContent), H=Handoff;
const plain=(name,value,cls)=>{const i=document.createElement(name);if(value!==undefined)i.textContent=value;if(cls)i.className=cls;return i;};
const a=(title,href)=>{const l=plain('a',title);l.href=href;return l;};
const art=$('artifact'),dem=$('demand'),refs=$('references'),list=$('checks'),group=$('caseButtons');
const next=$('next'),run=$('run'),reset=$('reset'),download=$('download'),play=$('handoff-play');
const eqURL=p=>'https://buildthesimulation.com'+p, atlas='/simulations/foundry/atlas/#profile=';
const dict=data.dictionary;
const fields={id:'Sample or fixture',revision:'Revision',revisionMeaning:'Revision tracks',waferMm:'Wafer diameter',status:'Recorded state',position:'Stored at',fixture:'Dry fixture',spanMm:'Printed marker span',units:'Units',unit:'Units',shape:'Substrate',sizeMm:'Side or diameter',nx:'Grid columns',ny:'Grid rows',frame:'Coordinate frame',syntheticEdit:'Bench counterfactual',dieId:'Die',carrierId:'Carrier',designRevision:'Design revision',passing:'Pads in tolerance',total:'Pad count',failed:'Pads out of tolerance',bondState:'Reported state',complete:'Full layout coverage',percent:'Covered',state:'Reported state',physicalMeasurement:'Physical measurement?',measuredRate:'Measured rate',estimate:'Estimated synthetic rate',reference:'Synthetic rate standard',decision:'Recorded decision',points:'Data points',edges:'Mapped edges',shorts:'Simulated short flags',source:'Origin',channels:'Channels',dtS:'Time step',t0S:'Start time',sideMm:'Panel side',widthMm:'Written width',heightMm:'Written height',lineUm:'Dense line',spaceUm:'Dense gap',thicknessMm:'Thickness'};
const groups={
 'wafer-custody':['id','revision','revisionMeaning','waferMm','position','status','fixture'],'detached-grid':['id','revision','spanMm'],
 'planning-envelope':['sideMm','widthMm','heightMm','lineUm','spaceUm','thicknessMm'],
 'commanded-dose':['id','revision','shape','sizeMm','unit','nx','ny','frame','syntheticEdit'],
 'latent-dose':['id','revision','shape','sizeMm','unit','nx','ny','frame'],
 'dry-placement':['dieId','carrierId','revision','passing','total','failed','bondState'],
 'seam-layout':['id','revision','percent','state','measuredRate'],
 'synthetic-leak':['id','revision','estimate','unit','decision','source'],
 'analog-waveform':['id','revision','unit','channels','points','dtS','syntheticEdit'],
 'connectivity-graph':['id','revision','edges','shorts','source']
};
const colors={match:'Matched',incompatible:'Incompatible',unknown:'Not established'};
function format(k,v){
 if(v==null)return 'Not established';
 if(typeof v==='boolean')return v?'Yes':'No';
 if(Array.isArray(v))return v.length?v.map(x=>Array.isArray(x)?x.join(' → '):x).join(', '):'None';
 if(typeof v!=='number')return v;
 if(k==='estimate')return v.toExponential(3);
 return (k==='spanMm'?Number(v.toFixed(3)):v)+(k.endsWith('Mm')?' mm':k.endsWith('Um')?' µm':k.endsWith('S')?' s':k==='percent'?'%':'');
}
const opt=(value,title)=>{const z=plain('option',title);z.value=value;return z;};
let cs, proof, lastAnnounced=0, ledgerProof;
const player=FoundryBenchPlay.create({paint:render,delay:2300});
const inputs=new URLSearchParams(location.search);
for(const c of H.cases){const b=plain('button');b.type='button';b.dataset.case=c.id;b.append(plain('b',c.number),plain('span',c.name));b.addEventListener('click',()=>choose(c.id));group.append(b);}
const text=(k,t)=>{$(k).textContent=t;};
function choose(id,fromURL=false){
 cs=H.cases.find(c=>c.id===id)??H.cases[0];
 for(const b of group.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.case===cs.id));
 text('prompt',cs.prompt);text('insight',cs.insight);
 $('profiles').replaceChildren(...cs.profiles.map(p=>a(data.profiles[p].title,atlas+p)));
 art.replaceChildren(...cs.artifactIds.map(i=>opt(i,data.records[i].title)));
 dem.replaceChildren(...cs.demandIds.map(i=>opt(i,H.demands[i].title)));
 if(fromURL){
  if(cs.artifactIds.includes(inputs.get('artifact')))art.value=inputs.get('artifact');
  if(cs.demandIds.includes(inputs.get('demand')))dem.value=inputs.get('demand');
 }
 setup(!fromURL);
}
function setup(pin=true){
 const origin=data.records[art.value],target=H.demands[dem.value];
 proof=H.prove(data,cs.id,art.value,dem.value);
 const re=$('record'),co=$('contract');
 re.replaceChildren(plain('h3',origin.title),plain('code',origin.schema,'schema'));
 const lp=plain('p',undefined,'record-tag'),station=data.evidence[origin.sources[0]]?.station;
 if(origin.kind==='planning-envelope')lp.textContent='Authored planning assumption. Not an inspected mask or sample.';
 else if(station)lp.append(a('Source station '+station,eqURL(data.equipment[station].simulatorUrl)));
 re.append(lp);
 const dl=plain('dl');
 for(const k of groups[origin.kind]||[]){if(!Object.hasOwn(origin.fields,k))continue;const row=plain('div',undefined,'fact');row.append(plain('dt',fields[k]||k),plain('dd',format(k,origin.fields[k])));dl.append(row);}
 re.append(dl);
 co.replaceChildren(plain('h3',target.type));
 const st=data.equipment[target.station], ref=plain('p',undefined,'record-tag');
 if(st)ref.append(a('Receiver '+st.id+' · '+st.name,eqURL(st.simulatorUrl)));
 else ref.textContent='External acceptance requirement, not a registered virtual station';
 co.append(ref);
 const items=plain('ul',undefined,'requirements');
 for(const t of target.contract)items.append(plain('li',t));
 co.append(items);
 if(pin&&location.protocol!=='file:'){
  const params=new URLSearchParams({case:cs.id,artifact:art.value,demand:dem.value});
  history.replaceState(null,'','?'+params);
 }
 const keys=[...new Set([...origin.sources,...target.sources,...proof.gates.flatMap(q=>q.sources)])];
 refs.replaceChildren(...keys.map(k=>{const x=data.evidence[k],li=plain('li');li.append(a(x.title,x.href));return li;}));
 text('pinned','Equipment register: '+dict.commit.slice(0,12)+' · checked '+dict.date+' · source record SHA-256 '+origin.recordSha256+'. Full hashes and the declared demand are included in the receipt.');
 lastAnnounced=0;player.load(proof.gates.length);text('announce','Loaded a new handoff. Prior checks cleared.');
}
function render(state){
 const {progress:revealed,total:len,mode}=state,complete=len>0&&revealed===len;
 const current=proof.gates[revealed-1], prefix=complete?'Finished':'Step '+revealed+' / '+len;
 const port=$('handoff-port'),meter=$('handoff-meter'),badge=$('handoff-stage-result'),bench=$('handoff-player');
 play.textContent=FoundryBenchPlay.playLabel[mode];
 bench.dataset.playback=mode;bench.dataset.step=String(revealed);
 meter.max=len||1;meter.value=revealed;
 text('handoff-play-count',revealed+' of '+len+' gates inspected');
 text('handoff-stage-name',current?(complete?'Last gate: ':prefix+' · ')+current.gate:'Ready to inspect');
 badge.className='chip '+(complete?proof.status:current?current.status:'ready');
 badge.textContent=complete?'Final: '+H.labels[proof.status]:current?colors[current.status]:'Virtual receipt';
 text('handoff-stage-detail',current?current.reason:'Play visits each check in order. Select a new source or receiver, or use the manual inspect buttons at any time.');
 const stopped=proof.gates.slice(0,revealed).find(g=>g.status!=='match');
 const tokenX=complete&&proof.status==='match'?226:stopped?106:revealed?Math.round(50+50*revealed/len):22;
 port.style.setProperty('--handoff-x',tokenX+'px');
 port.dataset.transit=complete&&proof.status==='match'?'received':stopped?'held':revealed?'inspection':'source';
 port.dataset.block=complete?proof.status:stopped?.status||'pending';
 if(mode==='running'&&revealed!==lastAnnounced&&current)text('announce','Gate '+revealed+': '+current.gate+'. '+colors[current.status]+'.');
 if(complete&&lastAnnounced!==revealed)text('announce',H.labels[proof.status]+'. All '+len+' gates inspected.');
 lastAnnounced=revealed;
 next.disabled=run.disabled=complete;reset.disabled=revealed===0;download.disabled=!complete;
 port.dataset.state=complete?proof.status:'pending';
 text('progress',revealed+' / '+len+' inspected');
 const verdict=$('verdict');verdict.className='chip '+(complete?proof.status:'ready');verdict.textContent=complete?H.labels[proof.status]:revealed?'Inspection in progress':'Not inspected';
 if(ledgerProof!==proof){list.replaceChildren();ledgerProof=proof;}
 proof.gates.forEach((g,i)=>{
  const pending=i>=revealed,visual=pending?'pending':g.status,existing=list.children[i];
  // Revealing the next gate never removes links from already-read rows.
  const li=existing?.dataset.state===visual?existing:plain('li');
  if(i===revealed-1)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');
  if(li===existing)return;
  li.dataset.state=visual;
  const content=plain('div'),head=plain('div',undefined,'gate-line');
  head.append(plain('strong',g.gate),plain('span',pending?'Pending':colors[g.status],'chip '+(pending?'ready':g.status)));
  content.append(head);
  if(!pending){
   content.append(plain('p',g.reason,'reason'));
   const cites=plain('p',undefined,'cite-line');g.sources.forEach((key,n)=>{const ref=data.evidence[key];if(ref)cites.append(a((n+1)+'. '+ref.title,ref.href));});content.append(cites);
  }
  li.append(plain('span',String(i+1).padStart(2,'0'),'no'),content);
  if(existing)existing.replaceWith(li);else list.append(li);
 });
 text('notes',complete?(proof.status==='match'?'This selection meets only the digital demand printed above. It does not qualify a physical article.':proof.status==='incompatible'?'At least one supplied field or record conflicts with this specific demand. A different documented artifact could change the decision.':'No explicit contradiction was found in the compared gates, but at least one required fact or adapter is unproven. Stop the chain here.'):'The overall decision appears after all gates are inspected. Read any incompatible or unproven gate before treating a virtual chain as connected.');
}
function announceStep(){
 const state=player.snapshot(),gate=proof.gates[state.progress-1];
 text('announce',state.mode==='complete'?H.labels[proof.status]+'. All '+state.total+' gates inspected.':gate?'Gate '+state.progress+': '+gate.gate+'. '+colors[gate.status]+'.':'Inspection reset.');
}
art.addEventListener('change',()=>setup());dem.addEventListener('change',()=>setup());
play.addEventListener('click',()=>{
 const wasPlaying=player.snapshot().running;
 player.toggle();
 if(wasPlaying)text('announce','Workflow paused.');
 else if(player.snapshot().running)text('announce','Playing workflow. '+$('handoff-stage-name').textContent+'.');
});
next.addEventListener('click',()=>{player.next();announceStep();});
run.addEventListener('click',()=>{player.finish();announceStep();});
reset.addEventListener('click',()=>{player.reset();announceStep();next.focus();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
download.addEventListener('click',()=>{
 if(player.snapshot().mode!=='complete')return;
 const record=data.records[art.value],demand=H.demands[dem.value],evidence={};
 for(const k of new Set([...record.sources,...demand.sources,...proof.gates.flatMap(q=>q.sources)]))if(data.evidence[k])evidence[k]=data.evidence[k];
 const obj={schema:'bts.process-handoff-receipt.v1',benchVersion:H.version,virtualOnly:true,pinnedEquipment:dict,part:{...record},demand:{id:dem.value,...demand},receipt:proof,evidence};
 if(dem.value==='developer'&&art.value==='contact')obj.executed={...data.proofs.developer};
 if(dem.value==='adc'&&art.value==='volts')obj.executed={...data.proofs.adc};
 const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)+'\n'],{type:'application/json'})),link=a('',url);link.download='handoff-'+cs.id+'-'+art.value+'-'+dem.value+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
});
choose(inputs.get('case'),true);
})();
