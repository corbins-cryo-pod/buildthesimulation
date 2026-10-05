import { contactArea, contactBounds, layoutBounds } from './model.js';
const num = n => Number(n.toFixed(4));
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function designDocument(name, contacts, routing, result, checks) {
  return { schema:'bts-neural-interface',version:1,units:'µm',name,contacts,routing,
    routes:result?.routes??[],pads:result?.pads??[],checks:checks??null,
    interpretation:'Concept geometry. No process qualification, electrical interface simulation, mechanical validation or stimulation safety calculation. Layers are independent conductive planes; no vias or process-specific openings are synthesized.' };
}
export function contactSvg(c, color, expand=0) {
  const angle=c.rotation, x=num(c.x),y=num(c.y), w=c.w+2*expand,h=(c.shape==='square'?c.w:c.h)+2*expand;
  if(c.shape==='circle')return `<circle cx="${x}" cy="${y}" r="${num(w/2)}" fill="${color}"/>`;
  if(c.shape==='ring')return `<path transform="translate(${x} ${y})" fill="${color}" fill-rule="evenodd" d="M ${num(w/2)} 0 A ${num(w/2)} ${num(w/2)} 0 1 0 ${num(-w/2)} 0 A ${num(w/2)} ${num(w/2)} 0 1 0 ${num(w/2)} 0 Z M ${num(Math.max(0,c.inner/2-expand))} 0 A ${num(Math.max(0,c.inner/2-expand))} ${num(Math.max(0,c.inner/2-expand))} 0 1 0 ${num(-Math.max(0,c.inner/2-expand))} 0 A ${num(Math.max(0,c.inner/2-expand))} ${num(Math.max(0,c.inner/2-expand))} 0 1 0 ${num(Math.max(0,c.inner/2-expand))} 0 Z"/>`;
  if(c.shape==='ellipse')return `<ellipse cx="${x}" cy="${y}" rx="${num(w/2)}" ry="${num(h/2)}" transform="rotate(${angle} ${x} ${y})" fill="${color}"/>`;
  return `<rect x="${num(x-w/2)}" y="${num(y-h/2)}" width="${num(w)}" height="${num(h)}" transform="rotate(${angle} ${x} ${y})" fill="${color}"/>`;
}
export function exportSvg(contacts,r,result,mode='review',layer=1) {
  const routes=result?.routes??[],pads=result?.pads??[],b=layoutBounds(contacts,pads,Math.max(r.substrateMargin,r.substrateStyle==='ribbons'?r.insulationMargin+r.width/2:0)),width=b.maxX-b.minX,height=b.maxY-b.minY;
  const routeById=new Map(routes.map(t=>[t.contactId,t]));
  const lines=(list,color,extra=0)=>list.filter(t=>t.status!=='unrouted').map(t=>`<polyline data-net="${esc(t.contactId)}" points="${t.points.map(p=>`${num(p.x)},${num(p.y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${num(t.width+extra)}" stroke-linecap="round" stroke-linejoin="${t.style==='manhattan'?'miter':'round'}"/>`).join('\n');
  let body='';
  if(mode==='substrate'||mode==='review'){
    const color=mode==='review'?'#dbe6e5':'#000000';
    if(r.substrateStyle==='envelope')body+=`<rect x="${num(b.minX)}" y="${num(b.minY)}" width="${num(width)}" height="${num(height)}" rx="${num(Math.min(r.substrateRadius,width/2,height/2))}" fill="${color}"/>`;
    else body+=lines(routes,color,r.insulationMargin*2)+contacts.map(c=>contactSvg({...c,shape:c.shape==='ring'?'circle':c.shape},color,r.substrateMargin)).join('')+pads.map(p=>`<rect x="${p.x-p.w/2-r.insulationMargin}" y="${p.y-p.h/2-r.insulationMargin}" width="${p.w+r.insulationMargin*2}" height="${p.h+r.insulationMargin*2}" fill="${color}"/>`).join('');
  }
  if(mode==='openings')body+=contacts.map(c=>contactSvg(c,'#000000')).join('')+pads.map(p=>`<rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" fill="#000000"/>`).join('');
  if(mode==='review'||mode==='metal')for(let l=1;l<=(mode==='metal'?1:r.layers);l++) {
    const at=mode==='metal'?layer:l,color=mode==='metal'?'#000000':['#bb8532','#138f94','#8565bf','#c66c82'][at-1];
    body+=`<g id="metal-${at}">`+lines(routes.filter(t=>t.layer===at),color)+contacts.filter(c=>(routeById.get(c.id)?.layer??(c.layer||1))===at).map(c=>contactSvg(c,color)).join('')+pads.filter(p=>(p.layer??1)===at).map(p=>`<rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" fill="${color}"/>`).join('')+'</g>';
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${num(width/1000)}mm" height="${num(height/1000)}mm" viewBox="${num(b.minX)} ${num(b.minY)} ${num(width)} ${num(height)}"><title>Neural interface ${esc(mode)} geometry</title><metadata>Coordinate units: micrometers. Curve centerlines are sampled polylines. Design review geometry; not qualified foundry masks. ${esc(JSON.stringify({rules:{minWidth:r.minWidth,minGap:r.minGap},layers:r.layers}))}</metadata>${body}</svg>`;
}
export function exportNetlist(contacts,result) {
  const byId=new Map((result?.routes??[]).map(t=>[t.contactId,t]));
  return 'contact_id,pad_id,channel,exit_side,layer,status,x_um,y_um,contact_area_um2,trace_width_um,trace_length_um,estimated_trace_resistance_ohm\n'+contacts.map(c=>{
    const t=byId.get(c.id); return [c.id,t?.padId??'',t?.channel??'',t?.side??'',t?.layer??'',t?.status??'unrouted',c.x,c.y,contactArea(c),t?.width??'',t?.length??'',t?.resistance??''].map(v=>{const text=typeof v==='string'&&/^[\s]*[=+@-]/.test(v)?`'${v}`:String(v);return `"${text.replaceAll('"','""')}"`;}).join(',');
  }).join('\n');
}
