/* Synthetic observation model. Rendering does not mutate numerical state. */
(function(){'use strict';
const {clamp,mix,wrap,TAU,pathPoint,pathLength}=CellEngine;
const FRAG=`precision highp float;
uniform sampler2D uMem; uniform sampler2D uStructure; uniform sampler2D uActin;
uniform vec2 uRes; uniform vec2 uNucleus; uniform vec2 uOffset; uniform float uScale; uniform float uTime;
uniform float uExposure; uniform float uGreen; uniform float uPink; uniform int uMode;
varying vec2 vUV;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){vec2 uv=vec2(vUV.x,1.-vUV.y),px=1./uRes;
 float m=texture2D(uMem,uv).a;
 float ml=texture2D(uMem,uv+vec2(px.x,0)).a,mr=texture2D(uMem,uv-vec2(px.x,0)).a;
 float mu=texture2D(uMem,uv+vec2(0,px.y)).a,md=texture2D(uMem,uv-vec2(0,px.y)).a;
 float edge=clamp(abs(ml-mr)+abs(mu-md),0.,1.);
 float g=texture2D(uStructure,uv).a,a=texture2D(uActin,uv).a;
 float gb=0.,ab=0.;
 for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){vec2 d=vec2(float(i),float(j))*px*1.6;gb+=texture2D(uStructure,uv+d).a/9.;ab+=texture2D(uActin,uv+d).a/9.;}}
 vec2 world=(uv*uRes-uOffset)/uScale;
 float grain=.48+.37*noise(world*4.8)+.23*noise(world*17.2);
 float strands=.5+.5*noise(world*.8+vec2(.03*uTime,0.));
 vec2 nc=(uv*uRes-uNucleus)/uScale;
 float nuc=1.-.60*exp(-dot(nc/vec2(2.6,3.4),nc/vec2(2.6,3.4))*1.3);
 vec3 col=vec3(.008,.013,.012);
 if(uMode==0){
  float green=(.085*m*strands*nuc+.65*g+.28*gb+.13*edge)*grain*uGreen;
  float pink=(.025*m*nuc+.78*a+.38*ab+.13*edge)*grain*uPink;
  col+=vec3(.12*green+.91*pink,.90*green+.025*pink,.24*green+.77*pink)*uExposure;
  col+=vec3(.008,.012,.009)*noise(gl_FragCoord.xy*.7);
 }else if(uMode==1){float surface=.12+.33*noise(world*.26)+.07*noise(world*2.);col+=m*vec3(.55,.67,.56)*surface*nuc+edge*vec3(.58,.73,.65)*.7;col+=g*.10;}
 else{col+=m*vec3(.12,.18,.20)*nuc+g*vec3(.24,.58,.55)*.6+edge*vec3(.46,.58,.51)*.65;}
 float vign=1.-.18*pow(length((uv-.5)*1.25),2.);gl_FragColor=vec4(col*vign,1.);
}`;
const VERT=`attribute vec2 aPos; varying vec2 vUV; void main(){vUV=(aPos+1.)*.5;gl_Position=vec4(aPos,0.,1.);}`;
function makeCanvas(){let c=document.createElement('canvas');return c;}
function smoothPath(ctx,points,close=true){
 if(points.length<2)return;ctx.beginPath();
 if(close){let last=points[points.length-1],first=points[0];ctx.moveTo((last.x+first.x)/2,(last.y+first.y)/2);for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}ctx.closePath();}
 else{ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length-1;i++){const p=points[i],q=points[i+1];ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}let last=points[points.length-1];ctx.lineTo(last.x,last.y);}
}
class Renderer{
 constructor(canvas,overlay){
  this.canvas=canvas;this.overlay=overlay;this.oc=overlay.getContext('2d');this.layers=[makeCanvas(),makeCanvas(),makeCanvas()];this.contexts=this.layers.map(c=>c.getContext('2d'));
  this.mode=0;this.showGreen=true;this.showPink=true;this.labels=false;this.showTrails=false;this.exposure=1.7;this.zoom=1;this.pan={x:0,y:0};this.selected=1;this.pixelRatio=1;this.width=0;this.height=0;this.scale=1;this.backend='Canvas 2D';this.rasterLayers=[makeCanvas(),makeCanvas(),makeCanvas()];this.rasterContexts=this.rasterLayers.map(c=>c.getContext('2d',{willReadFrequently:true}));this.rasterOut=makeCanvas();this.rasterCtx=this.rasterOut.getContext('2d');
  try{this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,premultipliedAlpha:false});if(this.gl)this.initGL();}catch(e){console.warn('WebGL unavailable; using raster fallback',e);this.gl=null;const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);this.canvas=replacement;canvas=replacement;}
  if(!this.gl)this.ctx=canvas.getContext('2d');this.resize();
 }
 initGL(){let gl=this.gl;function shader(kind,source){let s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  let program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VERT));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));this.program=program;gl.useProgram(program);
  let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'aPos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  this.uniforms={};for(const name of ['uRes','uNucleus','uOffset','uScale','uTime','uExposure','uGreen','uPink','uMode'])this.uniforms[name]=gl.getUniformLocation(program,name);
  this.textures=this.layers.map((_,i)=>{let t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,['uMem','uStructure','uActin'][i]),i);return t;});this.backend='WebGL + raster morphology';
 }
 resize(){const rect=this.canvas.parentElement.getBoundingClientRect();this.pixelRatio=Math.min(window.devicePixelRatio||1,1.5);const w=Math.max(100,Math.round(rect.width*this.pixelRatio)),h=Math.max(100,Math.round(rect.height*this.pixelRatio));if(w===this.width&&h===this.height)return;
  this.width=w;this.height=h;this.canvas.width=w;this.canvas.height=h;this.overlay.width=w;this.overlay.height=h;for(const l of this.layers){l.width=w;l.height=h;}
 }
 setup(){this.scale=Math.min(this.width/107,this.height/87)*this.zoom;this.offset={x:this.width*.49+this.pan.x*this.pixelRatio,y:this.height*.50+this.pan.y*this.pixelRatio};
  for(const c of this.contexts){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.width,this.height);c.setTransform(this.scale,0,0,this.scale,this.offset.x,this.offset.y);c.lineCap='round';c.lineJoin='round';c.fillStyle='white';c.strokeStyle='white';c.globalAlpha=1;c.globalCompositeOperation='source-over';}
 }
 screenToWorld(x,y){return{x:(x*this.pixelRatio-this.offset.x)/this.scale,y:(y*this.pixelRatio-this.offset.y)/this.scale};}
 worldToScreen(p){return{x:p.x*this.scale+this.offset.x,y:p.y*this.scale+this.offset.y};}
 fit(sim){let xmax=35,ymax=32;for(const n of sim.neurites)for(const p of n.nodes){xmax=Math.max(xmax,Math.abs(p.x)+10);ymax=Math.max(ymax,Math.abs(p.y)+10);}this.zoom=Math.min(this.width/(2*xmax),this.height/(2*ymax))/Math.min(this.width/107,this.height/87);this.zoom=clamp(this.zoom,.25,3);this.pan={x:0,y:0};}
 radius(n,s,sim){let base=n.parent===null?2.0+3.6*n.actin:.65+.8*n.actin,rad=.36+.48*n.mt+(base-.5)*Math.exp(-s/5.7);for(const w of sim.waves)if(w.neurite===n.id)rad+=1.25*Math.exp(-Math.pow((s-w.s)/2.4,2));return rad;}
 ribbon(n,sim){let left=[],right=[],s=0;for(let i=0;i<n.nodes.length;i++){const q=n.nodes[i];if(i)s+=Math.hypot(q.x-n.nodes[i-1].x,q.y-n.nodes[i-1].y);const prev=n.nodes[Math.max(0,i-1)],next=n.nodes[Math.min(n.nodes.length-1,i+1)];let th=Math.atan2(next.y-prev.y,next.x-prev.x),r=this.radius(n,s,sim);left.push({x:q.x-Math.sin(th)*r,y:q.y+Math.cos(th)*r});right.push({x:q.x+Math.sin(th)*r,y:q.y-Math.cos(th)*r});}return left.concat(right.reverse());}
 fanPoints(n){let tip=n.nodes[n.nodes.length-1],heading=n.heading;return n.fan.map((r,i)=>{let th=heading+i/n.fan.length*TAU;return{x:tip.x+Math.cos(th)*r,y:tip.y+Math.sin(th)*r};});}
 drawFilo(f,center,heading,baseRadius,mem,act,intensity=1){if(f.length<.06)return;let th=heading+f.theta,dx=Math.cos(th),dy=Math.sin(th),a={x:center.x+dx*baseRadius*.88,y:center.y+dy*baseRadius*.88},b={x:center.x+dx*(baseRadius+f.length),y:center.y+dy*(baseRadius+f.length)},cx=(a.x+b.x)/2-dy*f.bend,cy=(a.y+b.y)/2+dx*f.bend;
  for(const c of [mem,act]){c.globalAlpha=c===mem?1:.5*intensity;c.lineWidth=c===mem?.15:.095;c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(cx,cy,b.x,b.y);c.stroke();}mem.globalAlpha=act.globalAlpha=1;
 }
 drawMorphology(sim){const [mem,structure,act]=this.contexts,soma=sim.soma;
  smoothPath(mem,sim.somaPoints());mem.fill();
  // The mask is a union: soma, flared shaft ribbons, fans and filopodia.
  for(const n of sim.neurites){smoothPath(mem,this.ribbon(n,sim));mem.fill();smoothPath(mem,this.fanPoints(n));mem.fill();}
  // Diffuse soma cortex, modulated by the numerical cortical activity.
  for(let i=0;i<soma.r.length;i++){let th=i/soma.r.length*TAU,p=sim.somaAt(th),q=sim.somaAt(th+.075),a=soma.a[i];let visible=1;for(const n of sim.neurites)if(n.parent===null)visible*=1-Math.exp(-Math.pow(wrap(th-n.theta)/.35,2));act.globalAlpha=clamp((.15+a*.9)*visible,0,1);act.lineWidth=.26+.3*a;act.beginPath();act.moveTo(p.x,p.y);act.lineTo(q.x,q.y);act.stroke();}
  act.globalAlpha=1;
  // Structural bundles connect the soma to each shaft and fan; these are an
  // observation texture, not individually resolved microtubules.
  for(const n of sim.neurites){let cumulative=0;
   for(let fiber=0;fiber<4;fiber++){let points=[];if(n.parent===null)points.push({x:soma.x+Math.cos(n.theta+1)*2,y:soma.y+Math.sin(n.theta+1)*2});
    for(let j=0;j<n.nodes.length;j++){let q=n.nodes[j],prev=n.nodes[Math.max(j-1,0)],next=n.nodes[Math.min(j+1,n.nodes.length-1)],th=Math.atan2(next.y-prev.y,next.x-prev.x),off=(fiber-1.5)*.22+Math.sin(j*.47+fiber*1.8)*.10;points.push({x:q.x-Math.sin(th)*off,y:q.y+Math.cos(th)*off});}
    structure.globalAlpha=.20+.47*n.mt;structure.lineWidth=.11+.06*(fiber===1?1:0);smoothPath(structure,points,false);structure.stroke();
   }
   // Broad proximal sheet with faint stressed fiber paths.
   const root=n.nodes[0],probe=pathPoint(n.nodes,Math.min(6,n.length)),th=n.parent===null?n.theta:probe.angle;
   for(let k=-2;k<=2;k++){const normal={x:-Math.sin(th),y:Math.cos(th)},spread=(2.2+2*n.actin)*k/2;
    structure.globalAlpha=.08+.10*n.mt;structure.lineWidth=.10;structure.beginPath();structure.moveTo(root.x+normal.x*spread,root.y+normal.y*spread);structure.quadraticCurveTo(root.x+Math.cos(th)*3+normal.x*spread*.2,root.y+Math.sin(th)*3+normal.y*spread*.2,probe.x,probe.y);structure.stroke();
   }
   const tip=n.nodes[n.nodes.length-1],fan=this.fanPoints(n);
   act.globalAlpha=.13+.47*n.actin;act.lineWidth=.16;smoothPath(act,fan);act.stroke();
   for(let i=0;i<fan.length;i+=2){const p=fan[i],angle=n.heading+i/fan.length*TAU;
    act.globalAlpha=(.04+.20*n.actin)*(.65+.35*Math.sin(i*2.7+n.id));act.lineWidth=.08+.045*n.actin;
    act.beginPath();act.moveTo(tip.x-Math.cos(n.heading)*.6,tip.y-Math.sin(n.heading)*.6);act.quadraticCurveTo((tip.x+p.x)/2+Math.sin(angle)*.2,(tip.y+p.y)/2-Math.cos(angle)*.2,p.x,p.y);act.stroke();
   }
   for(const f of n.filopodia){const at=((f.theta%TAU)+TAU)%TAU/TAU*n.fan.length,index=Math.floor(at),rad=mix(n.fan[index],n.fan[(index+1)%n.fan.length],at-index);this.drawFilo(f,tip,n.heading,rad,mem,act,.7+.6*n.actin);}
   // Actin-rich traveling swelling, located at the actual propagated state.
   for(const w of sim.waves)if(w.neurite===n.id){const c=pathPoint(n.nodes,w.s);act.save();act.translate(c.x,c.y);act.rotate(c.angle);act.globalAlpha=.65;act.lineWidth=.18;act.beginPath();act.ellipse(0,0,1.8,1.2+.4*n.actin,0,0,TAU);act.stroke();for(let k=0;k<9;k++){let th=k/9*TAU;act.globalAlpha=.30;act.beginPath();act.moveTo(Math.cos(th)*.6,Math.sin(th)*.5);act.lineTo(Math.cos(th)*2.3,Math.sin(th)*1.6);act.stroke();}act.restore();}
  }
  for(const f of sim.somaFilopodia){const pt=sim.somaAt(f.theta),rad=Math.hypot(pt.x-soma.x,pt.y-soma.y);this.drawFilo(f,soma,0,rad,mem,act,.7);}
  // Sparse puncta in the soma: synthetic texture, explicitly not organelles.
  for(let i=0;i<39;i++){let th=i*2.399963,r=2+((i*17)%29)/29*4.1;const sx=soma.x+Math.cos(th)*r,sy=soma.y+Math.sin(th)*r;
   act.globalAlpha=.08+.19*((i*7)%11)/11;act.beginPath();act.ellipse(sx,sy,.14+.07*(i%3),.22+.06*(i%4),th,0,TAU);act.fill();
  }
  // Clip fluorescence to the same continuous membrane union.
  for(const c of [act,structure]){c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='destination-in';c.drawImage(this.layers[0],0,0);c.globalCompositeOperation='source-over';}
 }
 render(sim){this.resize();this.setup();this.drawMorphology(sim);
  if(this.gl){let gl=this.gl;gl.viewport(0,0,this.width,this.height);gl.useProgram(this.program);for(let i=0;i<3;i++){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.layers[i]);}
   const u=this.uniforms,n=this.worldToScreen({x:sim.soma.nx,y:sim.soma.ny});gl.uniform2f(u.uRes,this.width,this.height);gl.uniform2f(u.uNucleus,n.x,n.y);gl.uniform2f(u.uOffset,this.offset.x,this.offset.y);gl.uniform1f(u.uScale,this.scale);gl.uniform1f(u.uTime,sim.time);gl.uniform1f(u.uExposure,this.exposure);gl.uniform1f(u.uGreen,this.showGreen?1:0);gl.uniform1f(u.uPink,this.showPink?1:0);gl.uniform1i(u.uMode,this.mode);gl.drawArrays(gl.TRIANGLES,0,6);
  }else this.renderFallback(sim);
  this.drawOverlay(sim);
 }
 renderFallback(sim){
  // Software equivalent of the synthetic observation shader. All platforms
  // retain the same state-driven surface, optical grain, and unified edge.
  const w=Math.min(this.width,960),h=Math.round(this.height*w/this.width),factor=w/this.width;
  if(this.rasterOut.width!==w||this.rasterOut.height!==h){this.rasterOut.width=w;this.rasterOut.height=h;for(const c of this.rasterLayers){c.width=w;c.height=h;}this.rasterImage=this.rasterCtx.createImageData(w,h);this.grain=new Float32Array(w*h);for(let i=0;i<w*h;i++){let x=i%w,y=Math.floor(i/w),v=Math.sin(x*12.9898+y*78.233)*43758.5453;this.grain[i]=v-Math.floor(v);}}
  for(let i=0;i<3;i++){const c=this.rasterContexts[i];c.clearRect(0,0,w,h);c.drawImage(this.layers[i],0,0,w,h);}
  const M=this.rasterContexts[0].getImageData(0,0,w,h).data,G=this.rasterContexts[1].getImageData(0,0,w,h).data,A=this.rasterContexts[2].getImageData(0,0,w,h).data,out=this.rasterImage.data;
  const sw=this.scale*factor,offx=this.offset.x*factor,offy=this.offset.y*factor,nucx=sim.soma.nx,nucy=sim.soma.ny;
  for(let y=0;y<h;y++){for(let x=0;x<w;x++){const k=y*w+x,i=k*4,alpha=i+3;let m=M[alpha]/255,g=G[alpha]/255,a=A[alpha]/255;
   let left=x?alpha-4:alpha,right=x<w-1?alpha+4:alpha,up=y?alpha-w*4:alpha,down=y<h-1?alpha+w*4:alpha;
   const edge=Math.min(1,(Math.abs(M[left]-M[right])+Math.abs(M[up]-M[down]))/255),gb=(g*2+(G[left]+G[right]+G[up]+G[down])/255)/6,ab=(a*2+(A[left]+A[right]+A[up]+A[down])/255)/6;
   let r=.008,gr=.013,b=.012;
   if(m>0||edge>0||ab>0||gb>0){
    const wx=(x-offx)/sw,wy=(y-offy)/sw,dx=(wx-nucx)/2.6,dy=(wy-nucy)/3.4,nuc=1-.6*Math.exp(-(dx*dx+dy*dy)*1.3),grain=.43+.70*this.grain[k];
    const smooth=.55+.45*Math.sin(wx*1.7+Math.sin(wy*2.2))*Math.sin(wy*.84+wx*.4);
    if(this.mode===0){let green=(.13*m*smooth*nuc+.68*g+.32*gb+.21*edge)*grain*(this.showGreen?1:0),pink=(.032*m*nuc+.82*a+.4*ab+.17*edge)*grain*(this.showPink?1:0);
     r+=(.12*green+.91*pink)*this.exposure;gr+=(.90*green+.025*pink)*this.exposure;b+=(.24*green+.77*pink)*this.exposure;
    }else if(this.mode===1){let v=m*(.16+.30*smooth+.06*grain)*nuc;r+=v*.55+edge*.58*.7;gr+=v*.67+edge*.73*.7;b+=v*.56+edge*.65*.7;}
    else{r+=m*.12*nuc+g*.24*.6+edge*.46*.65;gr+=m*.18*nuc+g*.58*.6+edge*.58*.65;b+=m*.20*nuc+g*.55*.6+edge*.51*.65;}
   }
   out[i]=Math.min(255,r*255);out[i+1]=Math.min(255,gr*255);out[i+2]=Math.min(255,b*255);out[i+3]=255;
  }}
  this.rasterCtx.putImageData(this.rasterImage,0,0);this.ctx.drawImage(this.rasterOut,0,0,this.width,this.height);
 }

 drawOverlay(sim){let c=this.oc,pr=this.pixelRatio; c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.width,this.height);
  const label=(text,x,y,color='#b6c1b5',size=10)=>{c.fillStyle=color;c.font=`${size*pr}px ui-monospace, SFMono-Regular, Consolas, monospace`;c.fillText(text,x,y);};
  if(this.mode===2){
   for(const n of sim.neurites){for(let i=0;i<n.nodes.length;i++){const p=this.worldToScreen(n.nodes[i]);c.fillStyle=i===0?'#f0cf84':'#9bbcb4';c.beginPath();c.arc(p.x,p.y,1.3*pr,0,TAU);c.fill();if(i%4===0){const a=this.worldToScreen({x:n.nodes[i].ax,y:n.nodes[i].ay});c.strokeStyle='#60776d';c.lineWidth=pr*.6;c.beginPath();c.moveTo(a.x-2*pr,a.y);c.lineTo(a.x+2*pr,a.y);c.moveTo(a.x,a.y-2*pr);c.lineTo(a.x,a.y+2*pr);c.stroke();}}
    const tip=n.nodes[n.nodes.length-1],p=this.worldToScreen(tip),v=n.velocity*16*this.scale;let dx=Math.cos(n.heading)*v,dy=Math.sin(n.heading)*v;
    c.strokeStyle=n.velocity>=0?'#b1dfad':'#f1a2b7';c.lineWidth=1.2*pr;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+dx,p.y+dy);c.stroke();
   }
   label('NODES / SUBSTRATE ANCHORS / TIP VELOCITY',20*pr,this.height-52*pr,'#8fa99c',9);
  }
  if(this.labels)for(const n of sim.neurites){const tip=this.worldToScreen(n.nodes[n.nodes.length-1]);label('N'+n.id,tip.x+8*pr,tip.y-8*pr,n.id===this.selected?'#f0d7a0':'#a8b2a8');}
  for(const q of sim.pulses){const pt=this.worldToScreen(q);c.strokeStyle=`rgba(226,209,162,${Math.max(0,.65-q.age/25)})`;c.lineWidth=pr;c.setLineDash([3*pr,4*pr]);c.beginPath();c.arc(pt.x,pt.y,(4+q.age*.2)*this.scale,0,TAU);c.stroke();c.setLineDash([]);}
  if(this.showTrails){for(const n of sim.neurites){let p=this.worldToScreen(n.nodes[0]);c.fillStyle='#e3d7b5';c.fillRect(p.x-1*pr,p.y-1*pr,2*pr,2*pr);}}
  const bar=10*this.scale,x=this.width-24*pr-bar,y=this.height-23*pr;c.strokeStyle='#c6ccc2';c.lineWidth=2*pr;c.beginPath();c.moveTo(x,y);c.lineTo(x+bar,y);c.stroke();label('10 µm',x,y-8*pr,'#c6ccc2',10);
  label('SYNTHETIC / '+['DUAL CHANNEL','MEMBRANE SURFACE','MECHANICAL STATE'][this.mode],18*pr,24*pr,'#87948a',9);
  const seconds=Math.round(sim.time*60),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;label(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}  model time`,18*pr,43*pr,'#c0cbbc',12);
  if(this.mode===0){label('simulated scaffold',18*pr,this.height-37*pr,'#81bd89',9);label('simulated actin activity',18*pr,this.height-22*pr,'#bf78ae',9);}
 }
 snapshot(){const c=makeCanvas();c.width=this.width;c.height=this.height;const ctx=c.getContext('2d');ctx.drawImage(this.canvas,0,0);ctx.drawImage(this.overlay,0,0);return c.toDataURL('image/png');}
}
window.CellRenderer=Renderer;
})();
