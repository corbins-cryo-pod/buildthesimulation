const ns='http://www.w3.org/2000/svg';
function item(tag,attributes,text){
  const el=document.createElementNS(ns,tag);
  for(const [k,v] of Object.entries(attributes))el.setAttribute(k,v);
  if(text!==undefined)el.textContent=text;
  return el;
}
export function drawChart(svg,trace,samples,channel) {
  svg.replaceChildren();
  const width=680,left=55,right=652,top=18,bottom=152,end=trace.readings.at(-1).time_s;
  const vals=trace.readings.map(r=>r[channel]);
  const min=Math.floor(Math.min(...vals)),max=Math.max(min+1,Math.ceil(Math.max(...vals)));
  const x=t=>left+t/end*(right-left),y=v=>bottom-(v-min)/(max-min)*(bottom-top);
  svg.setAttribute('viewBox','0 0 '+width+' '+(210+samples.length*23));
  const add=(tag,attrs,txt)=>svg.append(item(tag,attrs,txt));
  for(const e of trace.events) {
    if(e.glass)add('rect',{x:x(e.start_s),y:top,width:x(e.end_s)-x(e.start_s),height:bottom-top,fill:'var(--accent)',opacity:.55});
  }
  for(let n=0;n<=4;n++){
    const level=min+(max-min)*n/4, clock=end*n/4;
    add('line',{x1:left,x2:right,y1:y(level),y2:y(level),stroke:'currentColor',opacity:.16});
    add('text',{x:left-8,y:y(level)+4,'text-anchor':'end'},level.toFixed(1));
    add('text',{x:x(clock),y:bottom+20,'text-anchor':'middle'},Math.round(clock).toString());
  }
  add('text',{x:left,y:bottom+42},'Elapsed time (s)');
  add('polyline',{points:trace.readings.map(r=>x(r.time_s).toFixed(2)+','+y(r[channel]).toFixed(2)).join(' '),stroke:'var(--trace)',fill:'none','stroke-width':2.7,'stroke-linejoin':'round'});
  samples.forEach((s,i)=>{
    const py=215+i*23;
    add('line',{x1:x(s.enter_s),x2:x(s.leave_s),y1:py,y2:py,stroke:'var(--trace)','stroke-width':5,opacity:.7});
    add('text',{x:left-6,y:py+4,'text-anchor':'end'},'S'+s.shelf);
  });
  const cursor=item('line',{x1:left,x2:left,y1:top,y2:bottom,stroke:'currentColor','stroke-dasharray':'4 3'});
  svg.append(cursor);
  return time=>{cursor.setAttribute('x1',x(time));cursor.setAttribute('x2',x(time));};
}
