const $=id=>document.getElementById(`gallery-${id}`);
const names={disk:'Disk',square:'Square',rectangle:'Rectangle · 4:1',ring:'Ring'};
let worker,maps=[],generation=0;
const fmt=v=>Number(v).toLocaleString(undefined,{maximumSignificantDigits:4});
const current=()=>Number($('current').value);
function color(t,quantity){
  if(quantity==='field') return `rgb(${Math.round(20+235*t)},${Math.round(25+185*t)},${Math.round(50-15*t)})`;
  const a=t<0?[37,110,200]:[220,90,20],u=Math.abs(t);
  return `rgb(${a.map(c=>Math.round(245+(c-245)*u)).join(',')})`;
}
function geometry(map){
  const r=map.diameter/2,area=Math.PI*r*r;
  if(map.shape==='disk')return `Nominal diameter ${fmt(map.diameter)} µm`;
  if(map.shape==='square')return `Side ${fmt(Math.sqrt(area))} µm`;
  if(map.shape==='rectangle')return `${fmt(2*Math.sqrt(area))} × ${fmt(Math.sqrt(area)/2)} µm`;
  return `Outer / inner diameters ${fmt(4*r/Math.sqrt(3))} / ${fmt(2*r/Math.sqrt(3))} µm`;
}
function draw(){
  const amp=current(),quantity=$('quantity').value,plane=$('plane').value;
  if(!Number.isFinite(amp)||amp<-100||amp>100){$('status').textContent='Enter a current between −100 and +100 µA.';return;}
  const factor=quantity==='field'?Math.abs(amp):amp;
  let max=0;for(const m of maps)for(const v of m.values)if(v)max=Math.max(max,Math.abs(v[quantity]*factor));
  const unit=quantity==='field'?'V/m':'mV';
  $('low').textContent=`${quantity==='field'?'0':fmt(-max)} ${unit}`;
  $('high').textContent=`${fmt(max)} ${unit}`;
  $('gradient').style.background=quantity==='field'?`linear-gradient(to right,${color(0,quantity)},${color(1,quantity)})`:`linear-gradient(to right,${color(-1,quantity)},${color(0,quantity)},${color(1,quantity)})`;
  $('cards').replaceChildren();
  for(const map of maps){
    const section=document.createElement('section'),heading=document.createElement('h2'),p=document.createElement('p'),canvas=document.createElement('canvas');
    heading.textContent=`${names[map.shape]} · ${map.diameter} µm equivalent disk`;
    p.textContent=`${geometry(map)} · Exposed area ${fmt(Math.PI*(map.diameter/2)**2)} µm²`;
    canvas.width=480;canvas.height=450;canvas.tabIndex=0;
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${heading.textContent}, ${quantity}, ${plane} slice. Arrow keys inspect map values.`);
    const ctx=canvas.getContext('2d'),left=54,top=14,size=380,cell=size/map.n;
    for(let row=0;row<map.n;row++)for(let col=0;col<map.n;col++){
      const value=map.values[row*map.n+col];
      ctx.fillStyle=value?color(max?value[quantity]*factor/max:0,quantity):'#aaa';
      ctx.fillRect(left+col*cell,top+row*cell,cell+.25,cell+.25);
    }
    const px=x=>left+(x+map.extent)/(2*map.extent)*size;
    const py=y=>top+(map.extent-y)/(2*map.extent)*size;
    // Draw the actual stair-step panel boundary, not an ideal curve hiding meshing.
    ctx.save();ctx.strokeStyle='white';ctx.lineWidth=1.3;ctx.setLineDash([3,2]);ctx.beginPath();
    const {hx,hy,panels}=map.model,r=map.diameter/2;
    if(plane==='top'){
      const key=(x,y)=>`${Math.round(x/hx*1e5)},${Math.round(y/hy*1e5)}`;
      const occupied=new Set(panels.map(([x,y])=>key(x,y)));
      for(const [x,y] of panels)for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
        if(occupied.has(key(x+dx*hx,y+dy*hy)))continue;
        const a=dx?[x+dx*hx/2,y-hy/2]:[x-hx/2,y+dy*hy/2];
        const b=dx?[x+dx*hx/2,y+hy/2]:[x+hx/2,y+dy*hy/2];
        ctx.moveTo(px(a[0]*r),py(a[1]*r));ctx.lineTo(px(b[0]*r),py(b[1]*r));
      }
    }else{
      ctx.setLineDash([]);ctx.strokeStyle='#e07924';ctx.lineWidth=4;
      for(const [x,y]of panels)if(Math.abs(y)<=hy/2+1e-9){ctx.moveTo(px((x-hx/2)*r),top+size);ctx.lineTo(px((x+hx/2)*r),top+size);}
    }
    ctx.stroke();ctx.restore();ctx.strokeStyle='#333';ctx.strokeRect(left,top,size,size);
    ctx.fillStyle='#333';ctx.font='12px system-ui';ctx.textAlign='center';
    for(const x of [-150,0,150])ctx.fillText(String(x),px(x),top+size+20);
    ctx.fillText('x (µm)',left+size/2,top+size+42);
    ctx.textAlign='right';for(const v of plane==='top'?[-150,0,150]:[0,150,300])ctx.fillText(String(v),left-8,plane==='top'?py(v)+4:top+size-v/300*size+4);
    ctx.save();ctx.translate(13,top+size/2);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.fillText(plane==='top'?'y (µm)':'z (µm)',0,0);ctx.restore();
    let column=32,row=32;
    function inspect(){
      const x=-150+(column+.5)*300/map.n,y=plane==='top'?150-(row+.5)*300/map.n:0,z=plane==='top'?Number($('height').value):300-(row+.5)*300/map.n;
      const v=map.values[row*map.n+column];
      $('readout').textContent=`${names[map.shape]} · ${map.diameter} µm: x ${fmt(x)}, y ${fmt(y)}, z ${fmt(z)} µm — ${v?`V = ${fmt(v.potential*amp)} mV; |E| = ${fmt(v.field*Math.abs(amp))} V/m`:'outside the numerical sampling guard'}.`;
    }
    canvas.addEventListener('pointermove',e=>{const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*480/rect.width,y=(e.clientY-rect.top)*450/rect.height;if(x<left||x>=left+size||y<top||y>=top+size)return;column=Math.floor((x-left)/cell);row=Math.floor((y-top)/cell);inspect();});
    canvas.addEventListener('focus',inspect);
    canvas.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;e.preventDefault();column=Math.max(0,Math.min(map.n-1,column+d[0]));row=Math.max(0,Math.min(map.n-1,row+d[1]));inspect();});
    section.append(heading,p,canvas);$('cards').append(section);
  }
  $('explanation').textContent=plane==='top'?`This slice is ${$('height').value} µm above the contact plane. The white footprint is a projection from z = 0, not an object at the slice height.`:'This cut passes through the contact center at y = 0. The contact lies on the bottom edge (orange); tissue extends upward to z = 300 µm. Gray cells lie too close to the contact plane for this gallery’s sampling guard.';
}
function calculate(){
  const mode=$('mode').value,plane=$('plane').value;
  $('size-label').hidden=mode!=='shapes';$('shape-label').hidden=mode!=='sizes';$('height-label').hidden=plane!=='top';
  const cards=mode==='shapes'?Object.keys(names).map(shape=>({shape,diameter:Number($('size').value)})):[25,50,100].map(diameter=>({shape:$('shape').value,diameter}));
  worker?.terminate();worker=new Worker(new URL('./gallery-worker.js',import.meta.url),{type:'module'});
  maps=[];$('cards').replaceChildren();$('status').textContent='Calculating maps…';$('readout').textContent='Preparing the new comparison…';
  const id=++generation;
  worker.onmessage=({data})=>{if(data.id!==generation)return;if(data.error){$('status').textContent=data.error;return;}maps=data.maps;draw();$('status').textContent='Maps ready · same current, shared physical axes and color scale.';$('readout').textContent='Move over a map, or focus it and use arrow keys, to inspect a location.';};
  worker.onerror=()=>{$('status').textContent='The field worker could not run. Reload to retry.';};
  worker.postMessage({cards,plane,height:Number($('height').value),id});
}
for(const id of ['mode','size','shape','plane','height'])$(id).addEventListener('change',calculate);
for(const id of ['quantity','current'])$(id).addEventListener('input',draw);
calculate();
