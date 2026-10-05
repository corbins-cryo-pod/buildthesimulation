import { contactArea, contactBounds, layoutBounds } from './model.js';
export function checkDesign(contacts, routing, result) {
  const issues = [], examples = [], add = (severity, code, message, ids = []) => { issues.push({ severity, code, message, ids }); if (examples.length < 40) examples.push(issues[issues.length-1]); };
  if(routing.width<routing.minWidth)add('error','linewidth',`Trace width ${routing.width} µm is below the selected ${routing.minWidth} µm minimum.`);
  if(routing.gap<routing.minGap)add('error','clearance',`Requested clearance ${routing.gap} µm is below the selected ${routing.minGap} µm minimum.`);
  if(routing.padPitch-routing.padWidth<routing.minGap)add('error','pad-spacing',`Connector pad gap is ${(routing.padPitch-routing.padWidth).toFixed(1)} µm, below ${routing.minGap} µm.`);
  const boxes=contacts.map(c=>contactBounds(c)), size=Math.max(1,...contacts.map(c=>Math.max(c.w,c.h)+routing.minGap)), bins=new Map();
  let closePairs=0;
  contacts.forEach((c,i)=>{
    const feature=c.shape==='ring'?(c.w-c.inner)/2:Math.min(c.w,c.shape==='rectangle'||c.shape==='ellipse'?c.h:c.w);
    if(feature<routing.minWidth)add('error','contact-feature',`${c.id}: minimum contact feature ${feature.toFixed(2)} µm is below the selected linewidth.`,[c.id]);
    if(c.layer>routing.layers)add('error','layer',`${c.id}: selected layer ${c.layer} exceeds the available layer count.`,[c.id]);
    const b=boxes[i], bx=Math.floor(c.x/size),by=Math.floor(c.y/size);
    for(let y=by-2;y<=by+2;y++)for(let x=bx-2;x<=bx+2;x++)for(const j of bins.get(`${x},${y}`)??[]) {
      const z=boxes[j], dx=Math.max(b.minX-z.maxX,z.minX-b.maxX,0),dy=Math.max(b.minY-z.maxY,z.minY-b.maxY,0);
      let gap=Math.hypot(dx,dy);
      if(['circle','ring'].includes(c.shape)&&['circle','ring'].includes(contacts[j].shape))gap=Math.hypot(c.x-contacts[j].x,c.y-contacts[j].y)-(c.w+contacts[j].w)/2;
      if(gap<routing.minGap){ closePairs++; if(closePairs<=15)add('error','contact-spacing',`${c.id} / ${contacts[j].id}: contacts or their conservative envelopes are closer than ${routing.minGap} µm.`,[c.id,contacts[j].id]); }
    }
    const key=`${bx},${by}`; if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);
  });
  const routes=result.routes??[], routed=routes.filter(t=>t.status==='routed'), conflicts=routes.filter(t=>t.status==='conflict'), unconnected=contacts.length-routed.length-conflicts.length;
  if(unconnected)add('error','unrouted',`${unconnected} contact(s) have no completed route. Add layers, use more exit sides, relax dimensions or change pad ordering.`,routes.filter(t=>t.status==='unrouted').slice(0,10).map(t=>t.contactId));
  if(conflicts.length)add('error','route-collision',`${conflicts.length} direct lead(s) intersect a clearance envelope on the same layer.`,conflicts.slice(0,15).map(t=>t.contactId));
  for(const note of result.routingNotes??[])add('info','router',note);
  if(routing.style==='manhattan')add('info','corners','Sharp corners are enabled. Mechanical reliability depends on the complete material stack and load case.');
  if(routing.layers>1)add('info','stack',`${routing.layers} independent metal planes: each contact and its pad share their route layer. A process-specific stack, layer access openings and any transitions must be engineered separately.`);
  return { issues:examples, issueCount:issues.length+Math.max(0,closePairs-15), errors:issues.filter(i=>i.severity==='error').length+Math.max(0,closePairs-15), closePairs, routed:routed.length, conflicts:conflicts.length, unconnected,
    totalArea:contacts.reduce((sum,c)=>sum+contactArea(c),0), totalLength:routed.reduce((sum,t)=>sum+t.length,0), maxResistance:Math.max(0,...routed.map(t=>t.resistance)),
    bounds:layoutBounds(contacts,result.pads??[],Math.max(routing.substrateMargin,routing.substrateStyle==='ribbons'?routing.insulationMargin+routing.width/2:0)) };
}
