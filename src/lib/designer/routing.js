import { assignPads, contactBounds, contactPort, layoutBounds, normalizeRouting, SIDES } from './model.js';
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function simplify(points) {
  const out = [];
  for (const p of points) {
    if (out.length && dist(out[out.length - 1], p) < 1e-6) continue;
    if (out.length > 1) {
      const a = out[out.length - 2], b = out[out.length - 1];
      if (Math.abs((b.x - a.x) * (p.y - b.y) - (b.y - a.y) * (p.x - b.x)) < 1e-6 && (b.x - a.x) * (p.x - b.x) + (b.y - a.y) * (p.y - b.y) >= 0) out.pop();
    }
    out.push(p);
  }
  return out;
}
export function roundedPath(points, radius) {
  if (radius <= 0 || points.length < 3) return points;
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1], ab = dist(a, b), bc = dist(b, c);
    const r = Math.min(radius, ab * .45, bc * .45);
    const p = { x: b.x + (a.x - b.x) * r / ab, y: b.y + (a.y - b.y) * r / ab };
    const q = { x: b.x + (c.x - b.x) * r / bc, y: b.y + (c.y - b.y) * r / bc };
    result.push(p);
    for (let k = 1; k <= 12; k++) { const t = k / 12, u = 1 - t; result.push({ x: u*u*p.x + 2*u*t*b.x + t*t*q.x, y: u*u*p.y + 2*u*t*b.y + t*t*q.y }); }
  }
  result.push(points[points.length - 1]); return simplify(result);
}
export function serpentineTail(points, amplitude, wavelength) {
  if (!amplitude || points.length < 2) return points;
  // Modulate only the longest straight section, retaining both exact endpoints.
  let at = 0, longest = 0;
  for (let i = 0; i < points.length - 1; i++) if (dist(points[i], points[i + 1]) > longest) { longest = dist(points[i], points[i + 1]); at = i; }
  if (longest < wavelength) return points;
  const a = points[at], b = points[at + 1], waves = Math.max(1, Math.floor(longest / wavelength)), nx = -(b.y - a.y) / longest, ny = (b.x - a.x) / longest;
  const out = points.slice(0, at + 1), steps = Math.min(2048, Math.max(32, waves * 32));
  for (let i = 1; i < steps; i++) { const t = i / steps, offset = amplitude * Math.sin(2 * Math.PI * waves * t) * Math.sin(Math.PI * t) ** 2; out.push({ x: a.x + (b.x-a.x)*t + nx*offset, y: a.y + (b.y-a.y)*t + ny*offset }); }
  return out.concat(points.slice(at + 1));
}
export const pathLength = points => points.slice(1).reduce((n, p, i) => n + dist(points[i], p), 0);
class Heap {
  constructor() { this.items = []; }
  push(item) { const a = this.items; let i = a.length; a.push(item); while (i) { const p = (i - 1) >> 1; if (a[p].f <= item.f) break; a[i] = a[p]; i = p; } a[i] = item; }
  pop() { const a = this.items, first = a[0], last = a.pop(); if (a.length) { let i = 0; while (i * 2 + 1 < a.length) { let j = i * 2 + 1; if (j + 1 < a.length && a[j + 1].f < a[j].f) j++; if (a[j].f >= last.f) break; a[i] = a[j]; i = j; } a[i] = last; } return first; }
}
export function routeDesign(contacts, input, onProgress = () => {}) {
  const r = normalizeRouting(input), pads = assignPads(contacts, r), bounds = layoutBounds(contacts, pads, Math.max(200, r.amplitude * 3, r.gap * 5));
  if (!contacts.length) return { routes: [], pads, bounds, step: 0, routingNotes: [] };
  const area = (bounds.maxX-bounds.minX)*(bounds.maxY-bounds.minY);
  const step = Math.max(r.width + r.gap, Math.sqrt(area / 450000));
  const nx = Math.ceil((bounds.maxX-bounds.minX)/step)+1, ny = Math.ceil((bounds.maxY-bounds.minY)/step)+1, total = nx*ny;
  if (total > 1500000) return { routes: [], pads, bounds, step, routingNotes: ['Layout aspect ratio exceeds the routing grid budget. Reduce bank span or use shorter connector banks.'] };
  const obstacles = new Uint16Array(total), occupied = Array.from({length:r.layers}, () => new Uint16Array(total));
  const cell = p => ({ x: Math.round((p.x-bounds.minX)/step), y: Math.round((p.y-bounds.minY)/step) });
  const point = index => ({ x: bounds.minX + index % nx * step, y: bounds.minY + Math.floor(index/nx) * step });
  const index = p => p.y * nx + p.x;
  const boxes = contacts.map((c,i) => ({ ...contactBounds(c, r.width/2 + r.gap + step*.71), owner:i+1 }));
  const owners = new Map(contacts.map((c,i)=>[c.id,i+1]));
  for (const p of pads) boxes.push({minX:p.x-p.w/2-r.gap-r.width/2-step*.71, maxX:p.x+p.w/2+r.gap+r.width/2+step*.71, minY:p.y-p.h/2-r.gap-r.width/2-step*.71, maxY:p.y+p.h/2+r.gap+r.width/2+step*.71, owner:owners.get(p.contactId)});
  for(const b of boxes) {
    const x0=Math.max(0,Math.floor((b.minX-bounds.minX)/step)), x1=Math.min(nx-1,Math.ceil((b.maxX-bounds.minX)/step)), y0=Math.max(0,Math.floor((b.minY-bounds.minY)/step)), y1=Math.min(ny-1,Math.ceil((b.maxY-bounds.minY)/step));
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) { const i=y*nx+x; obstacles[i]=obstacles[i] && obstacles[i]!==b.owner ? 65535 : b.owner; }
  }
  const g = new Float32Array(total), parent = new Int32Array(total), seen = new Uint32Array(total), closed = new Uint32Array(total);
  let stamp=0, spent=0;
  const passable = (i, owner, layer) => i>=0 && i<total && (!obstacles[i] || obstacles[i]===owner) && (!occupied[layer][i] || occupied[layer][i]===owner);
  const search = (a,b,owner,layer) => {
    const start=cell(a), end=cell(b), si=index(start), ei=index(end);
    if (!passable(si,owner,layer)||!passable(ei,owner,layer)) return null;
    stamp++; const heap=new Heap(); seen[si]=stamp; g[si]=0; parent[si]=-1; heap.push({i:si,f:Math.abs(start.x-end.x)+Math.abs(start.y-end.y)});
    let expanded=0;
    while(heap.items.length && expanded<60000 && spent<12000000) {
      const i=heap.pop().i; if(closed[i]===stamp)continue;
      if(i===ei) { const result=[]; let at=i; while(at!==-1){ result.push(point(at)); at=parent[at]; } return simplify(result.reverse()); }
      closed[i]=stamp; expanded++; spent++;
      const x=i%nx,y=Math.floor(i/nx);
      for(const next of [x>0?i-1:-1,x<nx-1?i+1:-1,y>0?i-nx:-1,y<ny-1?i+nx:-1]) {
        if(!passable(next,owner,layer)||closed[next]===stamp)continue;
        const bend=parent[i]>=0 && i-parent[i]!==next-i ? .3 : 0;
        const score=g[i]+1+bend;
        if(seen[next]!==stamp||score<g[next]) {seen[next]=stamp;g[next]=score;parent[next]=i;heap.push({i:next,f:score+Math.abs(next%nx-end.x)+Math.abs(Math.floor(next/nx)-end.y)});}
      }
    }
    return null;
  };
  const walk = (points, callback) => {
    for(let i=1;i<points.length;i++) { const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(dist(a,b)/(step*.4))); for(let j=0;j<=n;j++){ const t=j/n, p=cell({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}); if(callback(index(p))===false)return false; } }
    return true;
  };
  const reserve = (points, owner, layer) => walk(points, i => {
    const x=i%nx,y=Math.floor(i/nx), radius=Math.ceil((r.width+r.gap)/step);
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(x+dx>=0&&x+dx<nx&&y+dy>=0&&y+dy<ny)occupied[layer][(y+dy)*nx+x+dx]=owner;
  });
  const byPad = new Map(pads.map(p=>[p.contactId,p]));
  // Route outward sites first, freeing interior channels on subsequent layers.
  const order=[...contacts].sort((a,b)=>{const pa=byPad.get(a.id),pb=byPad.get(b.id);return Math.hypot(a.x-pa.x,a.y-pa.y)-Math.hypot(b.x-pb.x,b.y-pb.y);});
  const routes=[], routingNotes=[];
  for(let n=0;n<order.length;n++) {
    const c=order[n], pad=byPad.get(c.id), owner=owners.get(c.id), side=pad.side, anchor=contactPort(c,side,r.width/2), cb=contactBounds(c), inflate=r.gap+r.width/2+step*2;
    const outside={x:side==='left'?cb.minX-inflate:side==='right'?cb.maxX+inflate:anchor.x,y:side==='top'?cb.minY-inflate:side==='bottom'?cb.maxY+inflate:anchor.y};
    const end={x:side==='left'?pad.x+pad.w/2+inflate:side==='right'?pad.x-pad.w/2-inflate:pad.x,y:side==='top'?pad.y+pad.h/2+inflate:side==='bottom'?pad.y-pad.h/2-inflate:pad.y};
    const terminal={x:pad.x,y:pad.y}; let route=null, directFallback=null;
    const preferred=c.layer?Math.min(c.layer,r.layers)-1:(owner-1)%r.layers;
    for(let attempt=0;attempt<(c.layer?1:r.layers);attempt++) {
      const layer=(preferred+attempt)%r.layers;
      let points=r.style==='straight'?[anchor,terminal]:search(outside,end,owner,layer);
      if(!points)continue;
      if(r.style!=='straight')points=simplify([anchor,...points,terminal]);
      const safe=walk(points,i=>passable(i,owner,layer));
      if(!safe && r.style!=='straight')continue;
      // Try every eligible plane before accepting a visibly conflicting direct lead.
      if(!safe&&r.style==='straight'){directFallback??={points,layer};continue;}
      let usedStyle=r.style, status=safe?'routed':'conflict';
      if(r.style==='rounded'||r.style==='serpentine') {
        const smooth=roundedPath(points,r.radius);
        if(walk(smooth,i=>passable(i,owner,layer)))points=smooth;else usedStyle='manhattan';
        if(r.style==='serpentine') {
          const wave=serpentineTail(points,r.amplitude,r.wavelength);
          if(walk(wave,i=>passable(i,owner,layer)))points=wave;
          else { usedStyle='rounded'; routingNotes.push(`${c.id}: serpentine excursion could not clear neighbors; retained base route.`); }
        }
      }
      const length=pathLength(points);
      route={contactId:c.id,padId:pad.id,channel:pad.channel,side,layer:layer+1,width:r.width,points,length,status,style:usedStyle,resistance:length/r.width*r.sheetResistance};
      pad.layer=layer+1; reserve(points,owner,layer);break;
    }
    if(!route&&directFallback){const {points,layer}=directFallback,length=pathLength(points);route={contactId:c.id,padId:pad.id,channel:pad.channel,side,layer:layer+1,width:r.width,points,length,status:'conflict',style:'straight',resistance:length/r.width*r.sheetResistance};pad.layer=layer+1;reserve(points,owner,layer);}
    if(!route)routes.push({contactId:c.id,padId:pad.id,channel:pad.channel,side,layer:preferred+1,width:r.width,points:[anchor,terminal],length:0,status:'unrouted',style:r.style,resistance:null,reason:spent>=12000000?'Search budget reached':'No clear path on available layers'});
    else routes.push(route);
    if(n%16===0)onProgress({done:n+1,total:contacts.length});
  }
  if(step>r.width+r.gap+1e-6)routingNotes.unshift(`Large layout: routing grid coarsened to ${step.toFixed(1)} µm; narrow corridors may remain unrouted.`);
  return {routes:routes.sort((a,b)=>a.channel-b.channel),pads,bounds,step,routingNotes:[...new Set(routingNotes)].slice(0,30)};
}
