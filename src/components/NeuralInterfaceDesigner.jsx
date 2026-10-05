import { useEffect, useRef, useState } from 'preact/hooks';
import { DEFAULT_PATTERN, DEFAULT_ROUTING, MAX_CONTACTS, SHAPES, SIDES, LAYER_COLORS, generatePattern, normalizeRouting, normalizedContact, snap, hitContact, layoutBounds, assignPads, contactArea, parseDesign } from '../lib/designer/model.js';
import { renderCanvas } from '../lib/designer/canvas.js';
import { designDocument, exportSvg, exportNetlist } from '../lib/designer/export.js';
import '../styles/interface-designer.css';

const KEY = 'bts-interface-designer-v1';
const layouts = [['grid','Rectangular grid'],['hex','Staggered / hex grid'],['line','Single line'],['circle','Circle'],['concentric','Concentric circles'],['arc','Semicircular arc'],['perimeter','Rectangular perimeter'],['spiral','Golden-angle spiral']];
const arrangements = [['split-lr','Split left / right'],['left','All left'],['right','All right'],['top','All top'],['bottom','All bottom'],['split-tb','Split top / bottom'],['interleave-lr','Interleaved left / right'],['rows-lr','Alternating rows → left / right'],['cols-tb','Alternating columns → top / bottom'],['four-sides','Nearest of four sides']];
const styles = [['straight','Direct straight leads'],['manhattan','Orthogonal / sharp corners'],['rounded','Rounded corners'],['serpentine','Serpentine relief section']];
const fmt = (v, digits=1) => Number(v || 0).toLocaleString(undefined,{maximumFractionDigits:digits});
const nextId = contacts => Math.max(0,...contacts.map(c=>Number(c.id.match(/^E(\d+)$/)?.[1])||0).filter(n=>Number.isSafeInteger(n)&&n<1e9))+1;
function NumberField({label,value,onChange,min=0,max=100000,step=1,unit='µm'}) {
  return <label class="nd-field"><span>{label}{unit&&<small>{unit}</small>}</span><input type="number" value={value} min={min} max={max} step={step} onChange={e=>{const v=e.currentTarget.valueAsNumber;if(Number.isFinite(v))onChange(Math.max(min,Math.min(max,v)));}} /></label>;
}
function Choice({label,value,onChange,options}) {
  return <label class="nd-field"><span>{label}</span><select value={value} onChange={e=>onChange(e.currentTarget.value)}>{options.map(o=><option value={Array.isArray(o)?o[0]:o}>{Array.isArray(o)?o[1]:o}</option>)}</select></label>;
}
function Toggle({label,value,onChange}) {return <label class="nd-toggle"><input type="checkbox" checked={value} onChange={e=>onChange(e.currentTarget.checked)}/>{label}</label>;}
function download(body,type,name) {const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const presets = [
  {name:'64-contact grid',p:{...DEFAULT_PATTERN},r:{...DEFAULT_ROUTING}},
  {name:'256-contact grid',p:{...DEFAULT_PATTERN,rows:16,cols:16,pitchX:250,pitchY:250,w:40},r:{...DEFAULT_ROUTING,arrangement:'four-sides',width:3,gap:3,padPitch:80,padWidth:30,bankDistance:1600}},
  {name:'32-contact line',p:{...DEFAULT_PATTERN,layout:'line',count:32,pitchX:120},r:{...DEFAULT_ROUTING,arrangement:'bottom',layers:1,bankDistance:1000,padPitch:120}},
  {name:'24-contact circle',p:{...DEFAULT_PATTERN,layout:'circle',count:24,radius:650},r:{...DEFAULT_ROUTING,arrangement:'four-sides'}},
  {name:'Ring contacts',p:{...DEFAULT_PATTERN,rows:4,cols:4,shape:'ring',w:80,inner:40,pitchX:220,pitchY:220},r:{...DEFAULT_ROUTING,layers:2}},
  {name:'Flexible ribbon',p:{...DEFAULT_PATTERN,layout:'line',count:8,pitchX:160},r:{...DEFAULT_ROUTING,arrangement:'bottom',layers:1,style:'serpentine',amplitude:25,wavelength:260,padPitch:160,substrateStyle:'ribbons'}},
];

export default function NeuralInterfaceDesigner() {
  const [doc,setDoc]=useState(()=>({name:'Untitled neural interface',contacts:generatePattern(DEFAULT_PATTERN),routing:{...DEFAULT_ROUTING}}));
  const [pattern,setPattern]=useState({...DEFAULT_PATTERN}),[tab,setTab]=useState('pattern'),[selection,setSelection]=useState(new Set()),[tool,setTool]=useState('select');
  const [view,setView]=useState({scale:.2,x:0,y:0}),[options,setOptions]=useState({grid:10,snap:true,showGrid:true,showContacts:true,showTraces:true,showSubstrate:true,showAirwires:true,labels:false,layer:0});
  const [result,setResult]=useState(null),[progress,setProgress]=useState(null),[auto,setAuto]=useState(true),[force,setForce]=useState(0),[message,setMessage]=useState(''),[saved,setSaved]=useState(''),[ready,setReady]=useState(false),[dragBox,setDragBox]=useState(null),[historyVersion,setHistoryVersion]=useState(0),[pointer,setPointer]=useState(null),[exportLayer,setExportLayer]=useState(1);
  const canvas=useRef(null),root=useRef(null),fileInput=useRef(null),worker=useRef(null),job=useRef(0),history=useRef({past:[],future:[]}),docRef=useRef(doc),state=useRef(null),drag=useRef(null),space=useRef(false),fitNext=useRef(true),routeDoc=useRef(null),manualToken=useRef(force);
  docRef.current=doc;
  const current=result&&routeDoc.current?.contacts===doc.contacts&&routeDoc.current?.routing===doc.routing?result:null;
  state.current={doc,selection,view,options,tool,pattern,current};
  const selected=doc.contacts.filter(c=>selection.has(c.id)),first=selected[0];
  const pushHistory = previous => {const h=history.current;h.past.push(previous);if(h.past.length>40)h.past.shift();h.future=[];setHistoryVersion(v=>v+1);};
  const change = transform => {const previous=docRef.current,next=transform(previous);if(next===previous)return;pushHistory(previous);docRef.current=next;setDoc(next);setMessage('');};
  const undo = () => {const h=history.current;if(!h.past.length)return;h.future.push(docRef.current);const d=h.past.pop();docRef.current=d;setDoc(d);setSelection(new Set());setHistoryVersion(v=>v+1);};
  const redo = () => {const h=history.current;if(!h.future.length)return;h.past.push(docRef.current);const d=h.future.pop();docRef.current=d;setDoc(d);setSelection(new Set());setHistoryVersion(v=>v+1);};
  const routeChange=(key,value)=>change(d=>({...d,routing:normalizeRouting({...d.routing,[key]:value})}));
  const patternChange=(key,value)=>setPattern(p=>({...p,[key]:value}));
  const selectedChange=(key,value)=>change(d=>({...d,contacts:d.contacts.map(c=>selection.has(c.id)?normalizedContact({...c,[key]:value}):c)}));
  const fit = (data=docRef.current,route=current) => {const el=canvas.current;if(!el)return;const rect=el.getBoundingClientRect(),b=layoutBounds(data.contacts,route?.pads??assignPads(data.contacts,data.routing),data.routing.substrateMargin+50);const scale=Math.min((rect.width-80)/Math.max(100,b.maxX-b.minX),(rect.height-100)/Math.max(100,b.maxY-b.minY));setView({scale:Math.max(.0001,Math.min(10,scale)),x:-(b.minX+b.maxX)/2*scale,y:-(b.minY+b.maxY)/2*scale});};
  const generate = append => {const contacts=generatePattern(pattern,append?nextId(doc.contacts):1);if(append&&doc.contacts.length+contacts.length>MAX_CONTACTS){setMessage(`The editor supports up to ${MAX_CONTACTS.toLocaleString()} contacts. Reduce this pattern before adding it.`);return;}change(d=>({...d,contacts:append?d.contacts.concat(contacts):contacts}));setSelection(new Set());fitNext.current=true;setTimeout(()=>fit(),0);if(contacts.length===MAX_CONTACTS)setMessage(`Pattern limited to ${MAX_CONTACTS.toLocaleString()} contacts.`);};
  const preset = index => {const p=presets[index];setPattern({...p.p});change(()=>({name:p.name,contacts:generatePattern(p.p),routing:{...p.r}}));setSelection(new Set());fitNext.current=true;setTimeout(()=>fit(),0);};
  const removeSelected = () => {const s=state.current.selection;if(!s.size)return;change(d=>({...d,contacts:d.contacts.filter(c=>!s.has(c.id))}));setSelection(new Set());};
  const duplicate = () => {const s=state.current.selection,list=docRef.current.contacts.filter(c=>s.has(c.id));if(!list.length)return;if(docRef.current.contacts.length+list.length>MAX_CONTACTS){setMessage('Contact limit reached.');return;}const start=nextId(docRef.current.contacts),offset=Math.max(state.current.options.grid,20),copies=list.map((c,i)=>normalizedContact({...c,id:`E${start+i}`,x:c.x+offset,y:c.y+offset}));change(d=>({...d,contacts:d.contacts.concat(copies)}));setSelection(new Set(copies.map(c=>c.id)));};
  const moveSelected=(dx,dy)=>{const s=state.current.selection;change(d=>({...d,contacts:d.contacts.map(c=>s.has(c.id)?normalizedContact({...c,x:c.x+dx,y:c.y+dy}):c)}));};
  const zoom=(factor)=>setView(v=>({...v,scale:Math.max(.0001,Math.min(20,v.scale*factor)),x:v.x*factor,y:v.y*factor}));
  useEffect(()=>{
    try{const data=localStorage.getItem(KEY);if(data){const restored=parseDesign(JSON.parse(data));docRef.current=restored;setDoc(restored);setSaved('Restored local design');}}catch{setSaved('Previous local design could not be restored');}
    setReady(true);setTimeout(()=>fit(),0);
    return()=>worker.current?.terminate();
  },[]);
  useEffect(()=>{if(!ready)return;const timer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(designDocument(doc.name,doc.contacts,doc.routing,null,null)));setSaved('Saved in this browser');}catch{setSaved('Local save unavailable · download JSON to keep your design');}},700);return()=>clearTimeout(timer);},[doc,ready]);
  useEffect(()=>{
    if(!ready)return;worker.current?.terminate();worker.current=null;job.current++;setProgress(null);
    if(!auto&&manualToken.current===force)return;
    manualToken.current=force;
    const id=job.current, snapshot=doc;
    const timer=setTimeout(()=>{
      setProgress({done:0,total:snapshot.contacts.length});
      try{
        const w=new Worker(new URL('../lib/designer/worker.js',import.meta.url),{type:'module'});worker.current=w;
        w.onmessage=({data})=>{if(data.job!==job.current)return;if(data.progress){setProgress(data.progress);return;}setProgress(null);if(data.error){setMessage(`Routing stopped: ${data.error}`);}else{routeDoc.current=snapshot;const complete={...data.result,checks:data.checks};setResult(complete);if(fitNext.current){fitNext.current=false;fit(snapshot,complete);}}w.terminate();if(worker.current===w)worker.current=null;};
        w.onerror=()=>{setProgress(null);setMessage('Routing worker could not run. Try reloading this page.');w.terminate();};
        w.postMessage({job:id,contacts:snapshot.contacts,routing:snapshot.routing});
      }catch(error){setProgress(null);setMessage(`Routing unavailable: ${error.message}`);}
    },450);
    return()=>{clearTimeout(timer);worker.current?.terminate();};
  },[doc.contacts,doc.routing,ready,auto,force]);
  // Manual mode still reroutes after Route all is clicked, but never after later edits.
  useEffect(()=>{setExportLayer(v=>Math.min(v,doc.routing.layers));setOptions(o=>({...o,layer:o.layer>doc.routing.layers?0:o.layer}));},[doc.routing.layers]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;const observer=new ResizeObserver(()=>renderCanvas(el,state.current.doc,state.current.current,state.current.selection,state.current.view,state.current.options,drag.current?.box));observer.observe(el);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{if(canvas.current)renderCanvas(canvas.current,doc,current,selection,view,options,dragBox);},[doc,current,selection,view,options,dragBox,historyVersion]);
  const world = e => {const rect=canvas.current.getBoundingClientRect(),v=state.current.view;return{x:(e.clientX-rect.left-rect.width/2-v.x)/v.scale,y:(e.clientY-rect.top-rect.height/2-v.y)/v.scale};};
  const onDown = e => {
    if(e.button!==0&&e.button!==1)return;e.preventDefault();canvas.current.focus();canvas.current.setPointerCapture(e.pointerId);const s=state.current,p=world(e);
    if(s.tool==='pan'||space.current||e.button===1){drag.current={type:'pan',x:e.clientX,y:e.clientY,view:s.view};return;}
    if(s.tool==='add') {if(s.doc.contacts.length>=MAX_CONTACTS){setMessage('Contact limit reached.');return;}const c=normalizedContact({id:`E${nextId(s.doc.contacts)}`,x:s.options.snap?snap(p.x,s.options.grid):p.x,y:s.options.snap?snap(p.y,s.options.grid):p.y,shape:s.pattern.shape,w:s.pattern.w,h:s.pattern.h,inner:s.pattern.inner,rotation:s.pattern.contactRotation});change(d=>({...d,contacts:d.contacts.concat(c)}));setSelection(new Set([c.id]));return;}
    const visible=c=>s.options.showContacts&&(!s.options.layer||s.options.layer===(s.current?.routes.find(t=>t.contactId===c.id)?.layer??(c.layer||1)));
    const c=[...s.doc.contacts].reverse().find(c=>visible(c)&&hitContact(c,p.x,p.y));
    if(c){const ids=new Set(s.selection);if(e.shiftKey){if(ids.has(c.id))ids.delete(c.id);else ids.add(c.id);}else if(!ids.has(c.id)){ids.clear();ids.add(c.id);}setSelection(ids);drag.current={type:'move',origin:p,doc:s.doc,ids,changed:false};}
    else {drag.current={type:'box',origin:p,previous:e.shiftKey?s.selection:new Set()};if(!e.shiftKey)setSelection(new Set());}
  };
  const onMove = e => {
    const p=world(e);setPointer(p);const d=drag.current;if(!d)return;
    if(d.type==='pan'){setView({...d.view,x:d.view.x+e.clientX-d.x,y:d.view.y+e.clientY-d.y});return;}
    if(d.type==='move') {let dx=p.x-d.origin.x,dy=p.y-d.origin.y;const o=state.current.options;if(o.snap){dx=snap(dx,o.grid);dy=snap(dy,o.grid);}if(!dx&&!dy&&!d.changed)return;if(!d.changed){pushHistory(d.doc);d.changed=true;}const next={...d.doc,contacts:d.doc.contacts.map(c=>d.ids.has(c.id)?normalizedContact({...c,x:c.x+dx,y:c.y+dy}):c)};docRef.current=next;setDoc(next);return;}
    if(d.type==='box'){d.box={x:Math.min(p.x,d.origin.x),y:Math.min(p.y,d.origin.y),w:Math.abs(p.x-d.origin.x),h:Math.abs(p.y-d.origin.y)};setDragBox({...d.box});}
  };
  const onUp = () => {const d=drag.current;if(d?.type==='box'&&d.box){const b=d.box,ids=new Set(d.previous);docRef.current.contacts.forEach(c=>{if(c.x>=b.x&&c.x<=b.x+b.w&&c.y>=b.y&&c.y<=b.y+b.h)ids.add(c.id);});setSelection(ids);}drag.current=null;setDragBox(null);};
  useEffect(()=>{
    const el=canvas.current;const wheel=e=>{e.preventDefault();const rect=el.getBoundingClientRect(),s=state.current,px=e.clientX-rect.left-rect.width/2,py=e.clientY-rect.top-rect.height/2,factor=Math.exp(-e.deltaY*.0012);setView(v=>{const scale=Math.max(.0001,Math.min(20,v.scale*factor)),f=scale/v.scale;return{scale,x:px-(px-v.x)*f,y:py-(py-v.y)*f};});};
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
  },[]);
  const keyDown=e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
    const modifier=e.metaKey||e.ctrlKey,key=e.key.toLowerCase();
    if(modifier&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(modifier&&key==='y'){e.preventDefault();redo();return;}if(modifier&&key==='a'){e.preventDefault();setSelection(new Set(docRef.current.contacts.map(c=>c.id)));return;}
    if(key==='delete'||key==='backspace'){e.preventDefault();removeSelected();}if(key==='escape'){setSelection(new Set());setTool('select');}if(key===' '){e.preventDefault();space.current=true;}
    if(['arrowleft','arrowright','arrowup','arrowdown'].includes(key)){e.preventDefault();const n=(state.current.options.snap?state.current.options.grid:1)*(e.shiftKey?10:1);moveSelected(key==='arrowleft'?-n:key==='arrowright'?n:0,key==='arrowup'?-n:key==='arrowdown'?n:0);}
  };
  const importFile=async e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(!file)return;try{if(file.size>12e6)throw Error('JSON file exceeds the 12 MB import limit.');const imported=parseDesign(JSON.parse(await file.text()));change(()=>imported);setSelection(new Set());fitNext.current=true;setTimeout(()=>fit(),0);setMessage('Design imported. Routes are recomputed from the geometry.');}catch(error){setMessage(error.message);}};
  const slug=doc.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'neural-interface';
  const save=(kind)=>{if(kind==='json')download(JSON.stringify(designDocument(doc.name,doc.contacts,doc.routing,current,current?.checks),null,2),'application/json',`${slug}.json`);else if(kind==='csv')download(exportNetlist(doc.contacts,current),'text/csv',`${slug}-netlist.csv`);else download(exportSvg(doc.contacts,doc.routing,current,kind,Number(exportLayer)),'image/svg+xml',`${slug}-${kind}${kind==='metal'?'-'+exportLayer:''}.svg`);};
  const nf=(key,label,min=1,max=10000,step=1)=> <NumberField label={label} value={pattern[key]} min={min} max={max} step={step} onChange={v=>patternChange(key,v)}/>;
  const rf=(key,label,min=.5,max=2000,step=.5,unit='µm')=><NumberField label={label} value={doc.routing[key]} min={min} max={max} step={step} unit={unit} onChange={v=>routeChange(key,v)}/>;
  const sf=(key,label,min=1,max=10000,step=1,unit='µm')=><NumberField label={label} value={first?.[key]??0} min={min} max={max} step={step} unit={unit} onChange={v=>selectedChange(key,v)}/>;
  return <div class="nd" ref={root} onKeyDown={keyDown} onKeyUp={e=>{if(e.key===' ')space.current=false;}} onBlur={e=>{if(!root.current.contains(e.relatedTarget))space.current=false;}}>
    <div class="nd-docbar"><div><span class="nd-kicker">Thin-film layout</span><input class="nd-name" aria-label="Design name" value={doc.name} maxLength={100} onChange={e=>change(d=>({...d,name:e.currentTarget.value||'Untitled neural interface'}))}/><span class="nd-save">{saved||'Preparing workspace…'}</span></div><div class="nd-actions"><button onClick={()=>fileInput.current.click()}>Import JSON</button><button class="nd-primary" onClick={()=>save('json')}>Save design ↓</button></div><input ref={fileInput} hidden type="file" accept=".json,application/json" onChange={importFile}/></div>
    <div class="nd-presetbar"><span>Start with</span>{presets.map((p,i)=><button onClick={()=>preset(i)}>{p.name}</button>)}</div>
    <div class="nd-workspace">
      <aside class="nd-sidebar"><div class="nd-tabs" role="tablist" aria-label="Design controls">{[['pattern','Contacts'],['leads','Leads'],['inspect','Selection'],['rules','Stack & rules']].map(([key,label])=><button role="tab" id={`nd-tab-${key}`} aria-selected={tab===key} aria-controls={`nd-panel-${key}`} class={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</div>
        <div class="nd-panel" id={`nd-panel-${tab}`} role="tabpanel" aria-labelledby={`nd-tab-${tab}`}>
        {tab==='pattern'&&<>
          <h2>Build an array</h2><p class="nd-note">Dimensions are in µm and pitch is center to center. Up to 4,096 contacts; drag or edit them after generating.</p>
          <Choice label="Array pattern" value={pattern.layout} options={layouts} onChange={v=>patternChange('layout',v)}/>
          <div class="nd-fields">{['grid','hex','perimeter'].includes(pattern.layout)?<><NumberField label="Rows" value={pattern.rows} min={1} max={256} unit="" onChange={v=>patternChange('rows',v)}/><NumberField label="Columns" value={pattern.cols} min={1} max={256} unit="" onChange={v=>patternChange('cols',v)}/></>:<NumberField label={pattern.layout==='concentric'?'Contacts per circle':'Contact count'} value={pattern.count} min={1} max={MAX_CONTACTS} unit="" onChange={v=>patternChange('count',v)}/>}</div>
          {['grid','hex','perimeter','line','spiral'].includes(pattern.layout)&&<div class="nd-fields">{nf('pitchX',pattern.layout==='spiral'?'Radial scale':'X pitch')}{['grid','hex','perimeter'].includes(pattern.layout)&&nf('pitchY','Y pitch')}</div>}
          {['circle','arc','concentric'].includes(pattern.layout)&&nf('radius','Radius',1,100000)}
          {pattern.layout==='concentric'&&<div class="nd-fields"><NumberField label="Circles" value={pattern.rings} min={1} max={64} unit="" onChange={v=>patternChange('rings',v)}/>{nf('ringPitch','Radial pitch')}</div>}
          <div class="nd-fields">{nf('x','Center X',-1e6,1e6)}{nf('y','Center Y',-1e6,1e6)}<NumberField label="Pattern rotation" value={pattern.rotation} min={-360} max={360} unit="°" onChange={v=>patternChange('rotation',v)}/></div>
          <h3>Contact geometry</h3><Choice label="Shape" value={pattern.shape} options={SHAPES} onChange={v=>patternChange('shape',v)}/><div class="nd-fields">{nf('w',['circle','ring'].includes(pattern.shape)?'Outer diameter':'Width')}{['rectangle','ellipse'].includes(pattern.shape)&&nf('h','Height')}{pattern.shape==='ring'&&nf('inner','Inner diameter',0,Math.max(0,pattern.w-.5))}<NumberField label="Contact rotation" value={pattern.contactRotation} min={-360} max={360} unit="°" onChange={v=>patternChange('contactRotation',v)}/></div>
          <div class="nd-buttonrow"><button class="nd-primary" onClick={()=>generate(false)}>Generate / replace</button><button onClick={()=>generate(true)}>Add pattern</button></div><p class="nd-note">Replace can be undone. To add one contact at a time, use Place contact above the canvas.</p>
          <a class="nd-evidence" href="/simulations/interface-designer/guide/#contacts">Contact geometry notes ↗</a>
        </>}
        {tab==='leads'&&<>
          <h2>Leads</h2><p class="nd-note">Each contact connects to its own pad. Nets on the same metal plane stay separated. Dashed red lines are connections the router has not completed.</p>
          <Choice label="Lead exits" value={doc.routing.arrangement} options={arrangements} onChange={v=>routeChange('arrangement',v)}/><Choice label="Pad order" value={doc.routing.order} options={[["geometric","Position along bank"],["id","Contact creation order"],["reverse","Reverse position order"],["column","Column then row"],["snake","Row serpentine order"]]} onChange={v=>routeChange('order',v)}/>
          <Choice label="Lead geometry" value={doc.routing.style} options={styles} onChange={v=>routeChange('style',v)}/><div class="nd-fields">{rf('width','Trace width')}{rf('gap','Net clearance')}{<NumberField label="Metal planes" value={doc.routing.layers} min={1} max={4} unit="" onChange={v=>routeChange('layers',v)}/>}</div>
          {['rounded','serpentine'].includes(doc.routing.style)&&rf('radius','Corner setback',0,1000)}
          {doc.routing.style==='serpentine'&&<div class="nd-fields">{rf('amplitude','Wave amplitude',0,500)}{rf('wavelength','Wave period',20,2000)}</div>}
          <p class="nd-note">Rounded corners and serpentine sections are applied only where they clear existing routes. A serpentine uses the longest eligible segment; crowded routes keep their base shape.</p>
          <h3>Connector banks</h3><div class="nd-fields">{rf('bankDistance','Bank stand-off',100,20000)}{rf('padPitch','Pad pitch',5)}{rf('padWidth','Pad width',2,1000)}{rf('padHeight','Pad length',2,1000)}{rf('padOffset','Bank offset',-20000,20000)}</div>
          <a class="nd-evidence" href="/simulations/interface-designer/guide/#routing">Routing notes ↗</a><a class="nd-evidence" href="/simulations/interface-designer/guide/#mechanics">Serpentine leads ↗</a>
        </>}
        {tab==='inspect'&&<>
          <h2>{selection.size?`${selection.size} selected`:'Select a contact'}</h2><p class="nd-note">Click, shift-click or drag a box to select. Edits apply to every selected contact; with mixed values, the first contact is shown.</p>
          <div class="nd-buttonrow"><button onClick={()=>setSelection(new Set(doc.contacts.map(c=>c.id)))}>Select all</button><button onClick={()=>setSelection(new Set())}>Clear</button></div>
          {first&&<><p class="nd-selection-id">{selected.slice(0,8).map(c=>c.id).join(' · ')}{selected.length>8?' …':''}</p><Choice label="Selected shape" value={first.shape} options={SHAPES} onChange={v=>selectedChange('shape',v)}/><div class="nd-fields">{sf('w',['circle','ring'].includes(first.shape)?'Outer diameter':'Width')}{['rectangle','ellipse'].includes(first.shape)&&sf('h','Height')}{first.shape==='ring'&&sf('inner','Inner diameter',0,first.w-.5)}{sf('rotation','Rotation',-360,360,1,'°')}</div>
            {selected.length===1&&<div class="nd-fields">{sf('x','X',-1e6,1e6)}{sf('y','Y',-1e6,1e6)}</div>}
            <Choice label="Exit override" value={first.exit} options={['auto',...SIDES]} onChange={v=>selectedChange('exit',v)}/><Choice label="Metal layer override" value={String(first.layer)} options={[["0","Automatic"],...Array.from({length:doc.routing.layers},(_,i)=>[String(i+1),`Metal ${i+1}`])]} onChange={v=>selectedChange('layer',Number(v))}/>
            <div class="nd-area">First contact area <b>{fmt(contactArea(first))} µm²</b></div><div class="nd-buttonrow"><button onClick={duplicate}>Duplicate</button><button class="nd-danger" onClick={removeSelected}>Delete selection</button></div><button onClick={()=>change(d=>({...d,contacts:d.contacts.map(c=>selection.has(c.id)?{...c,x:snap(c.x,options.grid),y:snap(c.y,options.grid)}:c)}))}>Snap selection to grid</button><p class="nd-note">Arrow keys nudge by the snap interval, shift-arrow by ten. Connections are recomputed after each edit.</p></>}
          <details class="nd-contact-list"><summary>Choose a contact by ID ({doc.contacts.length})</summary><select size={8} aria-label="Contact to select" value={first?.id??''} onChange={e=>setSelection(new Set([e.currentTarget.value]))}>{doc.contacts.map(c=><option value={c.id}>{c.id} · {c.shape} · ({fmt(c.x)}, {fmt(c.y)})</option>)}</select></details>
        </>}
        {tab==='rules'&&<>
          <h2>Stack and process rules</h2><p class="nd-note">Editable concept rules, not a foundry design kit. Layers are independent planes; vias and layer access are not generated.</p>
          <Choice label="Rule example" value="custom" options={[["custom","Custom / current"],["generic","Illustrative 3 / 3 µm"],["published","Published 2026: 2 / 2.5 µm"]]} onChange={v=>{if(v==='custom')return;change(d=>({...d,routing:normalizeRouting({...d.routing,minWidth:v==='published'?2:3,minGap:v==='published'?2.5:3})}));}}/>
          <div class="nd-fields">{rf('minWidth','Min. linewidth')}{rf('minGap','Min. spacing')}</div><p class="nd-note">For reference, a 2026 polyimide process reports four Au metal layers, 2 µm linewidth and 2.5 µm spacing. That does not qualify this design.</p>
          <Choice label="Conductor metadata" value={doc.routing.material} options={[["Au","Gold (Au)"],["Pt","Platinum (Pt)"],["Custom","Custom stack"]]} onChange={v=>routeChange('material',v)}/><Choice label="Dielectric metadata" value={doc.routing.dielectric} options={['Polyimide','Parylene-C','SU-8','Custom']} onChange={v=>routeChange('dielectric',v)}/><div class="nd-fields">{rf('substrateThickness','Substrate thickness',.1,1000,.1)}{rf('sheetResistance','Assumed sheet R',0,1000,.01,'Ω/□')}</div><p class="nd-note">Trace resistance = length / width × sheet resistance. The 0.2 Ω/□ default is an assumed value and does not follow the material label. Electrode impedance, stimulation limits and tissue are not modeled.</p>
          <h3>Substrate outline</h3><Choice label="Outline" value={doc.routing.substrateStyle} options={[["envelope","Rounded envelope"],["ribbons","Conformal ribbons"]]} onChange={v=>routeChange('substrateStyle',v)}/><div class="nd-fields">{rf('substrateMargin','Contact margin',0)}{rf('substrateRadius','Envelope corner',0)}{rf('insulationMargin','Ribbon margin',0)}</div><p class="nd-note">Thickness is saved as metadata only. Ribbon margins widen the substrate around traces; there is no mechanical solver.</p><a class="nd-evidence" href="/simulations/interface-designer/guide/#fabrication">Stack and sources ↗</a>
        </>}
        </div>
      </aside>
      <section class="nd-stage" aria-label="Layout editor">
        <div class="nd-toolbar"><div class="nd-toolgroup">{[['select','Select / move'],['pan','Pan'],['add','Place contact']].map(([key,label])=><button class={tool===key?'active':''} aria-pressed={tool===key} onClick={()=>setTool(key)}>{label}</button>)}</div><div class="nd-toolgroup"><button title="Undo (Ctrl/Cmd Z)" disabled={!history.current.past.length} onClick={undo}>Undo</button><button title="Redo (Ctrl/Cmd Shift Z)" disabled={!history.current.future.length} onClick={redo}>Redo</button><button disabled={!selection.size} onClick={duplicate}>Duplicate</button><button disabled={!selection.size} onClick={removeSelected}>Delete</button></div><div class="nd-toolgroup"><button onClick={()=>fit()}>Fit</button><button aria-label="Zoom out" onClick={()=>zoom(.8)}>−</button><button aria-label="Zoom in" onClick={()=>zoom(1.25)}>+</button></div></div>
        <div class="nd-viewbar"><Toggle label="Snap" value={options.snap} onChange={v=>setOptions(o=>({...o,snap:v}))}/><label class="nd-grid-input">Grid <input aria-label="Snap grid interval in micrometers" type="number" min={1} max={10000} value={options.grid} onChange={e=>setOptions(o=>({...o,grid:Math.max(1,Math.min(10000,e.currentTarget.valueAsNumber||10))}))}/> µm</label><Toggle label="Grid" value={options.showGrid} onChange={v=>setOptions(o=>({...o,showGrid:v}))}/><Toggle label="Labels" value={options.labels} onChange={v=>setOptions(o=>({...o,labels:v}))}/><Choice label="View" value={String(options.layer)} options={[["0","All metal planes"],...Array.from({length:doc.routing.layers},(_,i)=>[String(i+1),`Metal ${i+1}`])]} onChange={v=>setOptions(o=>({...o,layer:Number(v)}))}/></div>
        <div class={`nd-canvas-wrap nd-tool-${tool}`}><canvas ref={canvas} tabIndex={0} aria-label="Neural interface layout. Select and drag contacts, shift-click for multiple selection, drag empty space to box-select, scroll to zoom, hold space to pan. Numeric editing is available in the Selection tab." onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp}/><div class="nd-canvas-summary"><span>{fmt(doc.contacts.length,0)} contacts</span><span>{doc.routing.layers} metal {doc.routing.layers===1?'plane':'planes'}</span>{progress&&<span class="nd-routing">Routing {fmt(progress.done,0)} / {fmt(progress.total,0)}…</span>}</div><div class="nd-canvas-legend">{LAYER_COLORS.slice(0,doc.routing.layers).map((color,i)=><span><i style={{background:color}}/>M{i+1}</span>)}<span><i class="nd-unrouted"/>Unresolved</span></div></div>
        <div class="nd-statusbar"><span>{pointer?`X ${fmt(pointer.x)} · Y ${fmt(pointer.y)} µm`:'Scroll to zoom · space-drag to pan'}</span><span>{selection.size} selected · {options.snap?`${options.grid} µm snap`:'free movement'}</span><Toggle label="Auto-route" value={auto} onChange={setAuto}/><button class="nd-primary" onClick={()=>setForce(v=>v+1)}>Route all</button>{progress&&<button onClick={()=>{worker.current?.terminate();worker.current=null;job.current++;setProgress(null);setMessage('Routing cancelled. Geometry is preserved.');}}>Cancel</button>}</div>
        <div class="nd-visibility">{[['showContacts','Contacts'],['showTraces','Leads & pads'],['showSubstrate','Substrate'],['showAirwires','Airwires']].map(([key,label])=><Toggle label={label} value={options[key]} onChange={v=>setOptions(o=>({...o,[key]:v}))}/>)}</div>
        {message&&<p class="nd-message" role="status">{message}</p>}
        <div class="nd-metrics"><div><span>Exposed contact area</span><b>{fmt(doc.contacts.reduce((s,c)=>s+contactArea(c),0)/1e6,4)} mm²</b></div><div><span>Completed routes</span><b>{current?`${current.checks.routed} / ${doc.contacts.length}`:'Pending'}</b></div><div><span>Total routed length</span><b>{current?`${fmt(current.checks.totalLength/1000)} mm`:'—'}</b></div><div><span>Max. estimated trace R</span><b>{current?`${fmt(current.checks.maxResistance)} Ω`:'—'}</b></div></div>
        <details class="nd-report" open={current?.checks.errors>0}><summary><span class={`nd-badge ${current&&!current.checks.errors?'ok':''}`}>{current?current.checks.errors?`${current.checks.errors} issue${current.checks.errors===1?'':'s'}`:'No conflicts found':'Pending routing'}</span>Geometry checks</summary><div><p class="nd-note">Checks contact envelopes, same-plane clearance and the rule values above. This is not a foundry DRC or an electrical or mechanical validation.</p>{current?current.checks.issues.length?<ul>{current.checks.issues.map(i=><li class={`nd-issue-${i.severity}`}>{i.message}{i.ids.length>0&&<button onClick={()=>{setSelection(new Set(i.ids));setTab('inspect');}}>Select</button>}</li>)}</ul>:<p>No issues under the current rules.</p>:<p>Run the router to update the checks and enable exports.</p>}{current?.checks.issueCount>40&&<p>Showing the first 40 of {current.checks.issueCount} findings.</p>}</div></details>
        <div class="nd-export"><div><h2>Export</h2><p class="nd-note">SVGs keep physical scale. Unrouted airwires are left out; direct leads flagged as conflicts stay in review exports. Check the findings before using the metal geometry.</p></div><div class="nd-export-buttons"><button onClick={()=>save('json')}>Design JSON ↓</button><button disabled={!current} onClick={()=>save('csv')}>Netlist CSV ↓</button><button disabled={!current} onClick={()=>save('review')}>Review SVG ↓</button><select aria-label="Metal layer to export" value={exportLayer} onChange={e=>setExportLayer(Number(e.currentTarget.value))}>{Array.from({length:doc.routing.layers},(_,i)=><option value={i+1}>Metal {i+1}</option>)}</select><button disabled={!current} onClick={()=>save('metal')}>Metal SVG ↓</button><button disabled={!current} onClick={()=>save('openings')}>Contact openings SVG ↓</button><button disabled={!current} onClick={()=>save('substrate')}>Substrate SVG ↓</button></div><p class="nd-note">Masks still need process-specific bias, alignment, insulation openings and DRC. The JSON holds net mapping, dimensions, stack assumptions, paths and checks. <a href="/simulations/interface-designer/guide/#exports">Export formats ↗</a></p></div>
      </section>
    </div>
    <div class="nd-footer-note"><span>Geometry in µm · area in µm² / mm² · physical-scale SVG</span><a href="/simulations/interface-designer/guide/">Guide and sources →</a></div>
  </div>;
}
