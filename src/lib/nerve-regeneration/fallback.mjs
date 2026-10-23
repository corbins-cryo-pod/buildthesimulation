import { axonAt, localMyelin, sampleFieldsAt } from './model.mjs';

// Canvas2D scientific fallback. Every fiber position, local maturation clock,
// and tissue state is sampled from the same result as the Three.js renderer.
// Shading is illustrative. No bitmap, measured histology, or 3D claim is made.
const C = { growing:'#69c6b5', brass:'#dcba78', myelin:'#e5dcc4', motor:'#d1a361', sensory:'#88bfc5', mismatch:'#d18472', stalled:'#817d76', selected:'#fff8c9', schwann:'#598c7d', nucleus:'#b2d4b9', debris:'#a19b8c', vessel:'#a96155', sheath:'#c3b59a', scaffold:'#87a2a2' };
const clamp=(x,lo=0,hi=1)=>Math.min(hi,Math.max(lo,x));
const hash=x=>{let n=(Math.imul((x|0)^0x68bc21eb,0x45d9f3b)>>>0);n=Math.imul(n^(n>>>16),0x45d9f3b)>>>0;return((n^(n>>>16))>>>0)/4294967296;};
const mix=(a,b,t)=>a+(b-a)*t;
function blend(a,b,t){const aa=parseInt(a.slice(1),16),bb=parseInt(b.slice(1),16);return `rgb(${Math.round(mix(aa>>16,bb>>16,t))},${Math.round(mix((aa>>8)&255,(bb>>8)&255,t))},${Math.round(mix(aa&255,bb&255,t))})`;}
const myelinPalette=Array.from({length:65},(_,i)=>blend(C.brass,C.myelin,i/64));
const supportPalette=Array.from({length:65},(_,i)=>blend('#9c6156','#83c9aa',i/64));

function fieldAt(fields,name,x){
  const xs=fields?.xMm,values=fields?.[name];if(!xs?.length||!values?.length)return 0;
  if(x<=xs[0])return values[0]||0;if(x>=xs.at(-1))return values.at(-1)||0;
  let lo=0,hi=xs.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(xs[m]<=x)lo=m;else hi=m;}
  return mix(values[lo],values[hi],(x-xs[lo])/(xs[hi]-xs[lo]));
}
function pointAt(axon,x){
  if(x<=0)return [x,...axon.origin];
  const path=axon.path;if(!path?.length)return [x,...axon.origin];
  let lo=0,hi=path.length-1;if(x>=path[hi].x)return [x,path[hi].y,path[hi].z];
  while(hi-lo>1){const m=(lo+hi)>>1;if(path[m].x<=x)lo=m;else hi=m;}
  const a=path[lo],b=path[hi],u=clamp((x-a.x)/Math.max(1e-12,b.x-a.x));
  return [x,mix(a.y,b.y,u),mix(a.z,b.z,u)];
}
function strokePath(ctx,points,tint,width,alpha=1){
  if(points.length<2)return;ctx.globalAlpha=alpha;ctx.strokeStyle=tint;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.globalAlpha=1;
}
function distanceSegment(px,py,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],u=clamp(((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy||1));return Math.hypot(px-a[0]-u*dx,py-a[1]-u*dy);}

export function createNerveFallback(container,{onSelect=()=>{}}={}){
  container.querySelector('.nr-scene-loading')?.remove();
  const canvas=document.createElement('canvas');canvas.className='nr-fallback-canvas';
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Interactive two-dimensional nerve section using simulated axon trajectories and tissue fields. Drag to pan, scroll to zoom, click a fiber to inspect.');
  canvas.style.cssText='display:block;width:100%;height:100%;touch-action:none;';container.prepend(canvas);
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Neither a WebGL nor a Canvas2D rendering context is available.');
  const abort=new AbortController();
  let result=null,shown=[],baseShown=[],fields=null,day=0,selected=null,mode='longitudinal',disposed=false;
  let width=1,height=1,pixelRatio=1,zoom=1,panX=0,panY=0,scheduled=0,hits=[],pointerDown=null;
  let gap=8,radius=1,xMin=-4,xMax=14;
  const options={view:'anatomy',showSheath:true,showSchwann:true,showVessels:false,showDebris:true,showScar:false,radialScale:3,fiberScale:3};
  const requestDraw=()=>{if(!scheduled&&!disposed)scheduled=requestAnimationFrame(()=>{scheduled=0;draw();});};

  function resize(){const rect=container.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);pixelRatio=Math.min(2,globalThis.devicePixelRatio||1);canvas.width=Math.round(width*pixelRatio);canvas.height=Math.round(height*pixelRatio);requestDraw();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);
  const themeObserver=new MutationObserver(requestDraw);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

  function tint(axon,state,x){
    if(selected===axon.id)return C.selected;
    if(options.view==='support')return x<0?'#b8b39d':supportPalette[Math.round(clamp(fieldAt(fields,'schwann',x))*64)];
    if(state.status==='lost'||state.status==='stalled')return C.stalled;
    if(state.entered&&!state.correctTarget)return C.mismatch;
    if(options.view==='anatomy'&&x<0)return axon.kind==='motor'?C.motor:C.sensory;
    if(state.status==='waiting')return '#a89b7d';
    return C.growing;
  }
  function coordinates(){
    const pad=width<500?30:50,span=xMax-xMin;
    const unit=Math.min((width-pad*2)/span,(height-136)/(radius*2.7*options.radialScale))*zoom;
    const center=(xMin+xMax)/2;
    return {unit,X:x=>width/2+(x-center)*unit+panX,Y:y=>height*.52-y*unit*options.radialScale+panY};
  }
  function text(label,x,y,{size=11,color='#c8beaa',align='left',alpha=1}={}){ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.font=`${size}px Arial, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(label,x,y);ctx.globalAlpha=1;}
  function ellipse(x,y,rx,ry,fill,stroke=null,alpha=1){ctx.globalAlpha=alpha;ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke();}ctx.globalAlpha=1;}

  function sheath(a,b,{graft=false,conduit=false}={}){
    const {X,Y,unit}=coordinates(),r=radius*(conduit?1.15:graft?.94:1);
    const top=Y(r),bottom=Y(-r),left=X(a),right=X(b);
    const gradient=ctx.createLinearGradient(0,top,0,bottom);
    if(conduit){gradient.addColorStop(0,'#87a2a250');gradient.addColorStop(.18,'#87a2a210');gradient.addColorStop(.82,'#87a2a209');gradient.addColorStop(1,'#87a2a250');}
    else{gradient.addColorStop(0,'#b3a38955');gradient.addColorStop(.08,'#877a5b30');gradient.addColorStop(.5,'#c3b59a10');gradient.addColorStop(.93,'#877a5b30');gradient.addColorStop(1,'#c3b59a55');}
    ctx.fillStyle=gradient;ctx.fillRect(left,top,right-left,bottom-top);
    ctx.strokeStyle=conduit?'#87a2a2a0':'#c3b59a8f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(right,top);ctx.moveTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();
    ctx.strokeStyle=conduit?'#87a2a240':'#c3b59a30';ctx.beginPath();ctx.moveTo(left,top+3);ctx.lineTo(right,top+3);ctx.moveTo(left,bottom-3);ctx.lineTo(right,bottom-3);ctx.stroke();
    if(conduit){ctx.strokeStyle='#87a2a220';ctx.lineWidth=.7;for(let x=a;x<=b;x+=.55){ctx.beginPath();ctx.moveTo(X(x),top);ctx.lineTo(X(x),top+6);ctx.moveTo(X(x),bottom-6);ctx.lineTo(X(x),bottom);ctx.stroke();}}
    else{
      const centers=(a>=gap&&gap>0)?result.geometry.distalFascicleCenters:result.geometry.fascicleCenters;
      for(const [cy]of centers||[]){const ry=.30*radius;ctx.fillStyle='#c3b59a09';ctx.fillRect(left,Y(cy+ry),right-left,ry*2*unit*options.radialScale);ctx.strokeStyle='#c3b59a32';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(left,Y(cy+ry));ctx.lineTo(right,Y(cy+ry));ctx.moveTo(left,Y(cy-ry));ctx.lineTo(right,Y(cy-ry));ctx.stroke();}
    }
    for(const x of[a,b]){ctx.strokeStyle=conduit?'#97b9b7a0':'#d6c6a580';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(X(x),top);ctx.lineTo(X(x),bottom);ctx.stroke();}
  }

  function drawStructure(){
    const {X,Y,unit}=coordinates(),crush=result.config.injury==='crush',repaired=day>=result.config.delayDays;
    if(repaired&&!crush&&result.config.repair==='conduit')sheath(-.4,gap+.4,{conduit:true});
    if(repaired&&!crush&&result.config.repair==='graft')sheath(0,Math.max(gap,.08),{graft:true});
    if(options.showSheath){if(crush)sheath(xMin,xMax);else{sheath(xMin,0);sheath(gap,xMax);}}
    if(crush){ctx.fillStyle='#aa6c5924';ctx.fillRect(X(-.14),Y(radius),.28*unit,2*radius*unit*options.radialScale);ctx.strokeStyle='#d1847280';ctx.setLineDash([2,4]);ctx.beginPath();ctx.moveTo(X(0),Y(radius*1.1));ctx.lineTo(X(0),Y(-radius*1.1));ctx.stroke();ctx.setLineDash([]);}
    if(repaired&&!crush&&result.config.repair!=='none'){
      for(const seam of gap>.5?[0,gap]:[0])for(const yy of[-.85,-.43,0,.43,.85]){
        const cx=X(seam),cy=Y(yy*radius);ctx.strokeStyle='#8ea9b5a0';ctx.lineWidth=.85;ctx.beginPath();ctx.ellipse(cx,cy,Math.max(2,.09*unit),Math.max(2,.035*unit*options.radialScale),-.5,0,Math.PI*2);ctx.stroke();
      }
    }
  }

  function drawEnvironment(){
    const {X,Y,unit}=coordinates();
    if(options.showVessels){
      for(let lane=0;lane<4;lane++){
        const sign=lane%2?1:-1,cy=sign*radius*(.66+.11*Math.floor(lane/2));
        for(let k=0;k<64;k++){
          const a=xMin+(xMax-xMin)*k/64,b=xMin+(xMax-xMin)*(k+1)/64,v=a<0?1:fieldAt(fields,'vascular',(a+b)/2);
          if(v<.15)continue;
          strokePath(ctx,[[X(a),Y(cy+.025*radius*Math.sin(a*.9+lane))],[X(b),Y(cy+.025*radius*Math.sin(b*.9+lane))]],C.vessel,Math.max(.6,.028*unit*options.radialScale),.22+.45*v);
        }
      }
    }
    if(options.showSchwann){
      for(let lane=0;lane<8;lane++)for(let k=0;k<24;k++){
        const x=xMin+(k+hash(lane*113+k*29))*(xMax-xMin)/24;
        const s=x<0?.75:fieldAt(fields,'schwann',x);
        if(hash(lane*197+k*31+5)>s||(x>0&&x<gap&&result.config.repair==='none'&&result.config.injury!=='crush'))continue;
        const y=radius*(-.68+lane*.195)+(hash(lane*93+k)-.5)*.06*radius;
        const cx=X(x),cy=Y(y),rx=Math.max(2,(.11+.1*hash(lane*31+k*17))*unit),ry=Math.max(.8,.025*unit*options.radialScale);
        ctx.fillStyle=C.schwann;ctx.globalAlpha=.58;ctx.beginPath();ctx.moveTo(cx-rx*1.55,cy);ctx.bezierCurveTo(cx-rx*.3,cy-ry*1.5,cx+rx*.3,cy-ry*1.5,cx+rx*1.55,cy);ctx.bezierCurveTo(cx+rx*.3,cy+ry*1.5,cx-rx*.3,cy+ry*1.5,cx-rx*1.55,cy);ctx.fill();ctx.globalAlpha=1;
        ellipse(cx,cy,Math.max(1,.035*unit),Math.max(.5,.012*unit*options.radialScale),C.nucleus,null,.8);
      }
    }
    if(options.showScar&&gap>0){for(let k=0;k<120;k++){const x=hash(k*71)*gap;if(hash(k*41+23)>fieldAt(fields,'scar',x))continue;const y=(hash(k*149)-.5)*1.8*radius;strokePath(ctx,[[X(x),Y(y)],[X(x+.1+hash(k*13)*.25),Y(y+.06*radius)]],'#a57570',.8,.4);}}
  }

  function drawDistalRemnants(){
    if(!options.showDebris)return;
    const {X,Y,unit}=coordinates();
    const originals=shown.filter((_,i)=>i%2===0);
    for(const axon of originals){
      const y=axon.target[0],baseWidth=Math.max(.45,.016*options.fiberScale*unit*options.radialScale);
      for(let k=0;k<14;k++){
        const a=gap+(k+hash(axon.id*127+k*31)*.15)*(xMax-gap)/14;
        const intact=fieldAt(fields,'intact',a),debris=fieldAt(fields,'debris',a);
        if(hash(axon.id*137+k*17)>intact+debris)continue;
        const length=intact>.5?(xMax-gap)/14*.83:.05+.13*hash(k*13+axon.id);
        const dy=(hash(axon.id*31+k*71)-.5)*.08*radius*(1-intact);
        strokePath(ctx,[[X(a),Y(y+dy)],[X(Math.min(xMax,a+length)),Y(y+dy+(1-intact)*.035*radius)]],intact>.5?'#c4c1ae':C.debris,baseWidth,.22+.42*Math.max(intact,debris));
      }
    }
  }

  function drawFibers(){
    const {X,Y,unit}=coordinates();hits=[];
    const ordered=[...shown].sort((a,b)=>a.origin[1]-b.origin[1]);
    if(selected!=null)ordered.sort((a,b)=>(a.id===selected?1:0)-(b.id===selected?1:0));
    for(const axon of ordered){
      const state=axonAt(axon,day,result.config),end=Math.min(xMax,Math.max(0,state.x)),isSelected=axon.id===selected;
      const base=.008*(.7+.6*(axon.caliberFactor||.8))*options.fiberScale*unit*options.radialScale;
      const coreWidth=Math.max(options.fiberScale===1?.1:.4,base)*(isSelected?1.6:1),depthAlpha=.64+.30*clamp((axon.origin[1]/radius+1)/2);
      const points=[],n=Math.min(80,Math.max(12,Math.ceil((end-xMin)/.25)));
      for(let j=0;j<=n;j++){const p=pointAt(axon,xMin+(end-xMin)*j/n);points.push([X(p[0]),Y(p[1])]);}
      strokePath(ctx,points,'#101c18',coreWidth+1.5,depthAlpha*.8);
      if(options.view==='support'){
        for(let j=1;j<points.length;j++){const xx=xMin+(end-xMin)*(j-.5)/n;strokePath(ctx,[points[j-1],points[j]],tint(axon,state,xx),coreWidth,depthAlpha);}
      }else{
        strokePath(ctx,points,tint(axon,state,end),coreWidth,depthAlpha);
        if(options.view==='anatomy'){const p0=pointAt(axon,0);strokePath(ctx,[[X(xMin),Y(axon.origin[0])],[X(0),Y(p0[1])]],isSelected?C.selected:axon.kind==='motor'?C.motor:C.sensory,coreWidth,depthAlpha);}
      }
      hits.push({id:axon.id,points,width:Math.max(5,coreWidth*2)});

      const internode=Math.max(.38+.20*hash(axon.id*71+7),(xMax-xMin)/75);
      for(let x=xMin+.07;x<end;x+=internode){
        const b=Math.min(end,x+internode*.82);if(b-x<.025)continue;
        const m=x<0?1:localMyelin(axon,(x+b)/2,day,result.config);if(m<.08)continue;
        const aPt=pointAt(axon,x),bPt=pointAt(axon,b),p1=[X(aPt[0]),Y(aPt[1])],p2=[X(bPt[0]),Y(bPt[1])];
        const sheathTint=isSelected?C.selected:state.entered&&!state.correctTarget&&x>=gap?'#c9a898':myelinPalette[Math.round(clamp(m)*64)];
        const outer=Math.max(.55,coreWidth*(1.05+.75*m));
        strokePath(ctx,[p1,p2],'#161e18',outer+1,.7*depthAlpha);
        strokePath(ctx,[p1,p2],sheathTint,outer,depthAlpha);
        if(outer>1.2)strokePath(ctx,[[p1[0],p1[1]-.22*outer],[p2[0],p2[1]-.22*outer]],'#fff7db',Math.max(.35,outer*.18),.2*depthAlpha);
      }
      if(state.x<xMax&&!['waiting','arrived','lost'].includes(state.status)){
        const tip=pointAt(axon,end),cx=X(tip[0]),cy=Y(tip[1]),r=Math.max(1.2,coreWidth*1.3),tipTint=isSelected?C.selected:state.status==='stalled'?C.stalled:C.growing;
        ellipse(cx,cy,r*1.8,r,tipTint,null,.95);
        for(let f=0;f<4;f++){const off=(f-1.5)*r;strokePath(ctx,[[cx+r,cy],[cx+r*(3.5+.4*hash(axon.id+f)),cy+off]],tipTint,Math.max(.4,coreWidth*.25),.85);}
      }
    }
  }

  function drawAnnotations(){
    const {X,Y,unit}=coordinates(),labelY=Math.max(57,Y(radius*1.17));
    text('PROXIMAL',X(xMin*.5),labelY,{size:10,align:'center'});
    if(gap>1.5)text(day<result.config.delayDays?'UNREPAIRED GAP':result.config.repair==='graft'?'STRUCTURED BRIDGE':result.config.repair==='conduit'?'GUIDANCE CONDUIT':'INJURY GAP',X(gap*.5),labelY,{size:10,align:'center',color:'#d8b77b'});
    text('DISTAL',X(gap+(xMax-gap)*.5),labelY,{size:10,align:'center'});
    const rulerY=Math.min(height-55,Y(-radius*1.25)),step=xMax-xMin>32?5:1;
    ctx.strokeStyle='#a69e896a';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(X(xMin),rulerY);ctx.lineTo(X(xMax),rulerY);ctx.stroke();
    for(let x=Math.ceil(xMin/step)*step;x<=xMax;x+=step){const major=x%5===0;ctx.beginPath();ctx.moveTo(X(x),rulerY);ctx.lineTo(X(x),rulerY+(major?5:3));ctx.stroke();if(major||x===0)text(String(x),X(x),rulerY+14,{size:9,align:'center'});}
    text('mm from injury',X(xMax),rulerY+14,{size:9,align:'right'});
    // A compact scale bar remains readable even when the anatomical ruler is
    // partially outside the field after deliberate zooming and panning.
    if(unit>0&&unit<width/3){const barMm=unit<15?5:1,bar=barMm*unit;ctx.strokeStyle='#d5cab1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,height-37);ctx.lineTo(18+bar,height-37);ctx.moveTo(18,height-40);ctx.lineTo(18,height-34);ctx.moveTo(18+bar,height-40);ctx.lineTo(18+bar,height-34);ctx.stroke();text(`${barMm} mm axial`,25+bar,height-37,{size:10});}
  }

  function drawSection(){
    hits=[];
    const stacked=width<470,rr=Math.min(stacked?width*.29:width*.185,stacked?(height-155)/4:(height-122)/2.2);
    const panels=stacked?[{cx:width*.5,cy:76+rr,distal:false},{cx:width*.5,cy:height-60-rr,distal:true}]:[{cx:width*.27,cy:height*.52,distal:false},{cx:width*.73,cy:height*.52,distal:true}];
    const sectionX=Math.min(xMax,gap+.5),proCs=result.geometry.fascicleCenters,distCs=result.geometry.distalFascicleCenters;
    for(const panel of panels){
      const {cx,cy,distal}=panel,centers=distal?distCs:proCs,scale=rr/radius;
      const gradient=ctx.createRadialGradient(cx-rr*.25,cy-rr*.3,rr*.15,cx,cy,rr);gradient.addColorStop(0,'#8e896b2a');gradient.addColorStop(.88,'#bcad8a28');gradient.addColorStop(1,'#c3b59a75');
      ellipse(cx,cy,rr,rr,options.showSheath?gradient:'#ffffff03',options.showSheath?'#c3b59a9f':'#c3b59a35');
      for(let i=0;i<centers.length;i++){
        const [y,z]=centers[i],xx=cx+y*scale,yy=cy-z*scale,fr=.30*rr;
        ellipse(xx,yy,fr,fr,'#d8c9a20d','#c3b59a50');
        text(String(i+1),xx,yy-fr-8,{size:9,align:'center',alpha:.7});
      }
      for(const axon of shown){
        const state=axonAt(axon,day,result.config),present=!distal||state.x>=sectionX;
        const original=distal&&options.showDebris&&(fieldAt(fields,'intact',sectionX)+fieldAt(fields,'debris',sectionX)>hash(axon.id*191));
        if(!present&&!original)continue;
        const p=distal?(present?pointAt(axon,sectionX):[sectionX,...axon.target]):[xMin,...axon.origin];
        const xx=cx+p[1]*scale,yy=cy-p[2]*scale,m=distal?(present?localMyelin(axon,sectionX,day,result.config):fieldAt(fields,'intact',sectionX)):1;
        const base=Math.max(.2,.004*(.7+.6*(axon.caliberFactor||.8))*options.fiberScale*scale),r=base*(axon.id===selected?1.5:1);
        if(m>.08)ellipse(xx,yy,r*(1.35+.65*m),r*(1.35+.65*m),present?(axon.id===selected?C.selected:myelinPalette[Math.round(clamp(m)*64)]):'#a19b8c88');
        ellipse(xx,yy,r,r,present?tint(axon,state,distal?sectionX:xMin):'#76736799');
        if(axon.id===selected){ctx.strokeStyle=C.selected;ctx.lineWidth=.8;ctx.beginPath();ctx.arc(xx,yy,r*2.8,0,Math.PI*2);ctx.stroke();}
        hits.push({id:axon.id,points:[[xx,yy],[xx+.01,yy]],width:Math.max(6,r*3)});
      }
      if(options.showSchwann){for(let i=0;i<24;i++){const a=i*Math.PI*2/24,r=.25+.6*hash(i*71);if(distal&&hash(i*83)>fieldAt(fields,'schwann',sectionX))continue;ellipse(cx+Math.cos(a)*r*rr,cy+Math.sin(a)*r*rr,2.2,1.1,C.nucleus,null,.6);}}
      text(distal?`DISTAL · x = ${sectionX.toFixed(1)} mm`:`PROXIMAL · x = ${xMin.toFixed(1)} mm`,cx,cy-rr-25,{size:10,align:'center',color:distal?'#d8b77b':'#c8beaa'});
      if(!stacked)text(distal?'Arrived fibers + retained distal material':'Preserved parent-axon profiles',cx,cy+rr+12,{size:10,align:'center'});
    }
    if(width<570){
      text('Procedural fascicle cross-sections.',width/2,height-44,{size:9,align:'center'});
      text('Each colored profile retains its parent identity.',width/2,height-32,{size:9,align:'center'});
    }else text('Fascicle cross-sections are procedural. Each visible colored profile retains its parent identity.',width/2,height-38,{size:10,align:'center'});
  }

  function draw(){
    if(disposed)return;ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.clearRect(0,0,width,height);
    const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,'#202623');bg.addColorStop(.55,'#2a302a');bg.addColorStop(1,'#202521');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
    if(width<80||height<120)return;
    text('2D ANATOMICAL SECTION · WEBGL UNAVAILABLE',17,21,{size:width<500?9:10,color:'#c8beaa'});
    text(mode==='cross-section'?'TRANSVERSE SECTIONS':'LONGITUDINAL SECTION',width-17,39,{size:9,align:'right',color:'#91aaa1'});
    if(!result){text('Preparing numerical trajectories…',width/2,height/2,{size:14,align:'center'});return;}
    fields=sampleFieldsAt(result,day);
    ctx.save();ctx.beginPath();ctx.rect(0,46,width,height-70);ctx.clip();
    if(mode==='cross-section')drawSection();else{drawStructure();drawDistalRemnants();drawEnvironment();drawFibers();drawAnnotations();}
    ctx.restore();
    const caption=mode==='cross-section'?`${shown.length}/${result.axons.length} parents · representative diameters ×${options.fiberScale} · click a profile to inspect`:`${shown.length}/${result.axons.length} parents · transverse ×${options.radialScale} · fiber diameter ×${options.fiberScale} · drag to pan / scroll to zoom`;
    text(caption,17,height-14,{size:width<500?8:10,color:'#b9b29e'});
  }

  function setResult(next){result=next;if(!result?.axons?.length){shown=[];baseShown=[];requestDraw();return;}gap=result.geometry.gapMm;radius=result.geometry.radiusMm;xMin=-result.geometry.proximalMm;xMax=gap+Math.min(6,result.geometry.distalMm);const n=Math.min(144,result.axons.length);baseShown=Array.from({length:n},(_,i)=>result.axons[Math.floor(i*result.axons.length/n)]);shown=[...baseShown];day=0;selected=null;zoom=1;panX=0;panY=0;requestDraw();}
  function setTime(value){day=clamp(Number(typeof value==='number'?value:value?.day)||0,0,result?.config.durationDays||Infinity);requestDraw();}
  function setOptions(next={}){const previous=options.radialScale;Object.assign(options,next);options.radialScale=clamp(Number(options.radialScale)||1,1,8);options.fiberScale=clamp(Number(options.fiberScale)||1,1,8);if('selected'in next){selected=next.selected==null?null:Number(next.selected);shown=[...baseShown];if(selected!=null&&result&&!shown.some(a=>a.id===selected)){const axon=result.axons.find(a=>a.id===selected);if(axon)shown[shown.length-1]=axon;}}if(previous!==options.radialScale){zoom=1;panX=0;panY=0;}requestDraw();}
  function resetCamera(preset='oblique'){mode=preset==='cross-section'?'cross-section':'longitudinal';zoom=1;panX=0;panY=0;requestDraw();}

  canvas.addEventListener('pointerdown',event=>{pointerDown={x:event.clientX,y:event.clientY,startX:panX,startY:panY,moved:false};canvas.setPointerCapture?.(event.pointerId);},{signal:abort.signal});
  canvas.addEventListener('pointermove',event=>{if(!pointerDown||mode==='cross-section')return;const dx=event.clientX-pointerDown.x,dy=event.clientY-pointerDown.y;if(Math.hypot(dx,dy)>4)pointerDown.moved=true;if(pointerDown.moved){panX=pointerDown.startX+dx;panY=pointerDown.startY+dy;requestDraw();}},{signal:abort.signal});
  canvas.addEventListener('pointerup',event=>{const start=pointerDown;pointerDown=null;canvas.releasePointerCapture?.(event.pointerId);if(!start||start.moved||!result)return;const rect=canvas.getBoundingClientRect(),px=event.clientX-rect.left,py=event.clientY-rect.top;let best=null,bestDistance=Infinity;for(const hit of hits){for(let i=1;i<hit.points.length;i++){const distance=distanceSegment(px,py,hit.points[i-1],hit.points[i]);if(distance<Math.max(5,hit.width)&&distance<bestDistance){best=hit.id;bestDistance=distance;}}}if(best!==null){selected=best;requestDraw();onSelect(best);}},{signal:abort.signal});
  canvas.addEventListener('pointercancel',()=>{pointerDown=null;},{signal:abort.signal});
  canvas.addEventListener('wheel',event=>{if(mode==='cross-section')return;event.preventDefault();const before=zoom;zoom=clamp(zoom*Math.exp(-event.deltaY*.001),.7,5);const rect=canvas.getBoundingClientRect(),px=event.clientX-rect.left-width/2,py=event.clientY-rect.top-height*.52;panX=px-(px-panX)*zoom/before;panY=py-(py-panY)*zoom/before;requestDraw();},{passive:false,signal:abort.signal});
  resize();
  return {available:false,renderer:'canvas2d',setResult,setTime,setOptions,resetCamera,get representativeCount(){return shown.length;},dispose(){if(disposed)return;disposed=true;abort.abort();resizeObserver.disconnect();themeObserver.disconnect();if(scheduled)cancelAnimationFrame(scheduled);canvas.remove();}};
}
