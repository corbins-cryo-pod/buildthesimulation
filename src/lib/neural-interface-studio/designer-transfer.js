/** Exact-coordinate, bounded handoff. No autorouting, geometric scaling or plane flattening. */
import { preset, validateProject, domainOf, maskPath } from './model.js';
export const TRANSFER_VERSION = 'designer-transfer/1.0.0';
const fail = (code, detail) => { const e = new Error(detail); e.code=code; throw e; };
const number = (v,min,max,label) => {
  if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail('invalid-number',`${label} must be a finite number in [${min}, ${max}].`);
  return v;
};
const array = (v,min,max,label) => {
  if(!Array.isArray(v)||v.length<min||v.length>max)fail('unsupported-size',`${label}: supported count is ${min}–${max}. Nothing was truncated.`);
  return v;
};
const unique = (items,key,label) => {
  const keys=items.map(x=>x?.[key]);
  if(keys.some(k=>typeof k!=='string'||!k.length||k.length>120)||new Set(keys).size!==keys.length)fail('invalid-id',`${label} need unique, nonempty IDs.`);
};
const rotation = v => ((number(v??0,-1e6,1e6,'Rotation')%360)+540)%360-180;
function shapeBounds(s) {
  const a=s.rotation*Math.PI/180,c=Math.cos(a),t=Math.sin(a),rx=s.w/2,ry=s.h/2;
  const ex=s.shape==='rect'?Math.abs(rx*c)+Math.abs(ry*t):Math.hypot(rx*c,ry*t);
  const ey=s.shape==='rect'?Math.abs(rx*t)+Math.abs(ry*c):Math.hypot(rx*t,ry*c);
  return {minX:s.x-ex,maxX:s.x+ex,minY:s.y-ey,maxY:s.y+ey};
}
export function importDesigner(text,{cellUm=2,openingInsetUm=4,metalThicknessUm=.2}={}) {
  if(typeof text!=='string'||text.length>2000000)fail('file-size','Choose a Designer JSON file smaller than 2 MB.');
  const source=JSON.parse(text);
  if(source?.schema!=='bts-neural-interface'||source.version!==1)fail('schema','Choose a version 1 Neural Interface Designer export.');
  if(!['µm','um'].includes(source.units))fail('units','Designer export must explicitly use µm or um. Unit conversion is not inferred.');
  const contacts=array(source.contacts,1,16,'Contacts'),routes=array(source.routes,1,16,'Saved routes'),pads=array(source.pads,1,16,'Connector pads');
  unique(contacts,'id','Contacts');unique(pads,'id','Pads');unique(routes,'contactId','Routes');
  if(routes.length!==contacts.length||pads.length!==contacts.length)fail('incomplete-routing','Each contact needs exactly one saved route and pad. Complete routing in Designer and export again.');
  if(!source.routing||source.routing.dielectric!=='Polyimide')fail('dielectric','This process supports Polyimide only. Other dielectric labels cannot be assigned this recipe silently.');
  if(source.routing.substrateStyle!=='envelope')fail('substrate','Conformal-ribbon substrates are not supported by this transfer. Select an envelope or retain the file for a later process model.');
  if(!['Au','Pt','Custom'].includes(source.routing.material))fail('material','Unknown conductor label.');
  number(openingInsetUm,0,40,'Opening axis inset');number(metalThicknessUm,.01,2,'Film thickness');
  const rs=number(source.routing.sheetResistance,1e-6,1000,'Assumed sheet resistance');
  const margin=number(source.routing.substrateMargin,0,2000,'Substrate margin');
  const radius=number(source.routing.substrateRadius,0,2000,'Substrate corner radius');
  number(source.routing.substrateThickness,.1,50,'Base polymer thickness');
  const p=preset(),d={id:'designer-import',revision:1,name:source.name??'Imported Designer layout',units:'um',outline:[],sites:[],pads:[],traces:[],openings:[],nets:[]};
  const warnings=[],mapping=[];
  for(let i=0;i<contacts.length;i++) {
    const c=contacts[i],t=routes.find(r=>r.contactId===c.id),pad=pads.find(p=>p.id===t?.padId);
    if(!t||!pad||pad.contactId!==c.id)fail('terminal-mapping',`${c.id}: route-to-pad references do not agree.`);
    if(t.status!=='routed')fail('unrouted',`${c.id}: route status is ${String(t.status)}. Unresolved or conflicting airwires are not fabricated as metal.`);
    if(t.layer!==1||pad.layer!==1||(c.layer!==undefined&&c.layer!==0&&c.layer!==1))fail('metal-planes',`${c.id}: only physical metal plane 1 is supported. No multilayer flattening or vias are inferred.`);
    if(!Number.isInteger(t.channel)||t.channel!==i+1||pad.channel!==t.channel)fail('channel-mapping',`${c.id}: channel numbering does not match the saved contact/pad mapping.`);
    if(!['circle','square','rectangle','ellipse','ring'].includes(c.shape))fail('shape',`${c.id}: unsupported contact shape.`);
    const w=number(c.w,2,1000,`${c.id} width`),h=['circle','square','ring'].includes(c.shape)?w:number(c.h,2,1000,`${c.id} height`);
    const tag=String(i+1).padStart(2,'0'),netId=`N${tag}`;
    const site={id:`E${tag}`,netId,sourceId:c.id,shape:['square','rectangle'].includes(c.shape)?'rect':c.shape,x:number(c.x,-1e6,1e6,'Contact X'),y:number(c.y,-1e6,1e6,'Contact Y'),w,h,inner:c.shape==='ring'?number(c.inner,0,w-1,'Ring inner diameter'):0,rotation:rotation(c.rotation)};
    const terminal={id:`P${tag}`,netId,sourceId:pad.id,shape:'rect',x:number(pad.x,-1e6,1e6,'Pad X'),y:number(pad.y,-1e6,1e6,'Pad Y'),w:number(pad.w,2,1000,'Pad width'),h:number(pad.h,2,1000,'Pad height'),inner:0,rotation:0};
    if(!['straight','rounded','serpentine','manhattan'].includes(t.style))fail('route-style',`${c.id}: unknown saved route style.`);
    const points=array(t.points,2,256,`${c.id} saved points`).map(q=>[number(q?.x,-1e6,1e6,'Route X'),number(q?.y,-1e6,1e6,'Route Y')]);
    const width=number(t.width,2,80,'Trace width');
    d.sites.push(site);d.pads.push(terminal);d.traces.push({id:`T${tag}`,netId,width,join:t.style==='manhattan'?'miter':'round',points});d.nets.push({id:netId,siteId:site.id,padId:terminal.id});
    for(const [s,kind]of [[site,'site'],[terminal,'pad']]) {
      const opening={...s,id:`O-${s.id}`,targetId:s.id,kind,w:s.w-2*openingInsetUm,h:s.h-2*openingInsetUm,inner:s.shape==='ring'?s.inner+2*openingInsetUm:0};
      delete opening.netId;delete opening.sourceId;
      if(opening.w<2||opening.h<2||opening.inner>Math.min(opening.w,opening.h)-1)fail('opening-inset',`${c.id}: ${openingInsetUm} µm inset removes the ${kind} opening. Reduce inset explicitly; no aperture was silently enlarged.`);
      d.openings.push(opening);
    }
    mapping.push({netId,sourceContactId:c.id,sourcePadId:pad.id,sourceChannel:t.channel});
    if(width/cellUm<4)warnings.push(`${c.id}: trace is only ${(width/cellUm).toFixed(2)} cells wide. Refine the grid before quantitative interpretation.`);
    if(c.shape==='ellipse')warnings.push(`${c.id}: openings use an axis inset, not a constant-distance erosion of the ellipse.`);
  }
  // Match Designer envelope bounds exactly; include route excursions only in the observation window.
  const boxes=[...d.sites,...d.pads].map(shapeBounds);
  const minX=Math.min(...boxes.map(b=>b.minX))-margin,maxX=Math.max(...boxes.map(b=>b.maxX))+margin;
  const minY=Math.min(...boxes.map(b=>b.minY))-margin,maxY=Math.max(...boxes.map(b=>b.maxY))+margin;
  d.outline=[[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY]];
  d.outlineShape={type:'rounded-rectangle',minX,minY,maxX,maxY,radius:Math.min(radius,(maxX-minX)/2,(maxY-minY)/2)};
  const allBounds=[...boxes,{minX,maxX,minY,maxY},...d.traces.flatMap(t=>t.points.map(([x,y])=>({minX:x-4*t.width,maxX:x+4*t.width,minY:y-4*t.width,maxY:y+4*t.width})))];
  const x0=Math.floor((Math.min(...allBounds.map(b=>b.minX))-8)/4)*4,y0=Math.floor((Math.min(...allBounds.map(b=>b.minY))-8)/4)*4;
  const x1=Math.ceil((Math.max(...allBounds.map(b=>b.maxX))+8)/4)*4,y1=Math.ceil((Math.max(...allBounds.map(b=>b.maxY))+8)/4)*4;
  d.window={minX:x0,minY:y0,widthUm:x1-x0,heightUm:y1-y0,pivotX:(minX+maxX)/2,pivotY:(minY+maxY)/2};
  const assumptions=[`Imported saved paths without rerouting; coordinates remain in µm.`, `New openings use a ${openingInsetUm} µm axis inset; Designer's coincident nominal windows are not a process mask.`, `Effective resistivity is derived from the Designer assumption ${rs} Ω/□ and the chosen ${metalThicknessUm} µm film.`, 'Upper polymer and process parameters are Studio teaching assumptions, not supplied by the Designer.', 'Passing transfer checks is not a fabrication design-rule sign-off or experimental validation.'];
  d.provenance={adapter:TRANSFER_VERSION,sourceSchema:source.schema,sourceVersion:source.version,sourceName:d.name,materialLabel:source.routing.material,dielectric:'Polyimide',sourceSheetResistanceOhm:rs,openingInsetUm,mapping,warnings,assumptions};
  p.design=d;p.cellUm=cellUm;p.recipe.baseThicknessUm=source.routing.substrateThickness;p.recipe.metalThicknessUm=metalThicknessUm;p.recipe.resistivityOhmM=rs*metalThicknessUm*1e-6;
  return {project:validateProject(p),report:{mapping,warnings,assumptions,window:domainOf(d)}};
}
/** Physically sized vector export; row-run polygons retain the physical origin. */
export function conductorSvg(result) {
  const g=result?.geometry;
  if(!g||!(g.metal instanceof Uint8Array))throw Error('Fabricate a specimen before exporting its conductor.');
  const x=g.minX??0,y=g.minY??0,w=g.widthUm??g.nx*g.cellUm,h=g.heightUm??g.ny*g.cellUm;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w/1000}mm" height="${h/1000}mm" viewBox="${x} ${y} ${w} ${h}"><title>Teaching raster: fabricated conductor. Geometry in micrometres; not qualified production masks.</title><path d="${maskPath(g.metal,g.nx,g.cellUm,x,y)}"/></svg>`;
}
