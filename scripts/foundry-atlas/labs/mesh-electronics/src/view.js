/* Substrate viewer: shared XY artwork, explicit projected schematic Z. Canvas2D only. */
(function(){
  'use strict';
  const E=globalThis.MeshEngine,P=E.P;
  const Layer={
    carrier:{c:'#6c8092',lo:-.47,hi:-.18},
    nickel:{c:'#b0bfc7',lo:-.18,hi:0},
    lower:{c:'#b87939',lo:0,hi:.45},
    gold:{c:'#fac75c',lo:.45,hi:.533},
    platinum:{c:'#b9e1f3',lo:.533,hi:.586},
    upper:{c:'#68b9a7',lo:.533,hi:.983},
    fixture:{c:'#de9bd2',lo:1.0,hi:1.15}
  };
  const explodedOffset={carrier:-.72,nickel:-.36,lower:0,gold:.42,platinum:.86,upper:1.24,fixture:1.72};
  const views={overview:'Overview',mesh:'Open mesh',site:'Selected site',stem:'Stem',io:'ZIF pads',section:'Layer stack'};
  const box=(x,y,dx,dy,stretch=1)=>({x,y,dx,dy,stretch});
  const conf=(key,r,row)=>key==='mesh'?box(2000,0,4150,2630):
    key==='site'?box(r.site[0]+20,r.site[1],290,175):
    key==='stem'?box(18280,-167,2040,415):
    key==='io'?box(row.pinX-110,380,2220,1570):
    key==='section'?box(r.site[0]+58,r.site[1]-21,285,139):
    box(18930,-50,40800,3950,4.0);
  const polygons=new WeakMap();
  function rings(x,y,r,n=28) {
    return Array.from({length:n},(_,k)=>[x+r*Math.cos(2*Math.PI*k/n),y+r*Math.sin(2*Math.PI*k/n)]);
  }
  function drawPolygons(p) {
    let cached=polygons.get(p);
    if(cached)return cached;
    if(p.shape==='rect')cached={loops:[[[p.x,p.y],[p.x+p.w,p.y],[p.x+p.w,p.y+p.h],[p.x,p.y+p.h]]]};
    else if(p.shape==='circle')cached={loops:[rings(p.x,p.y,p.r),...(p.hole?[rings(p.x,p.y,p.hole).reverse()]:[])]};
    else {
      const path=p.pts, w=p.w/2, loops=[], dots=[];
      for(let i=1;i<path.length;i++){
        const [a,b]=[path[i-1],path[i]], dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;
        const X=-dy*w/l,Y=dx*w/l;
        loops.push([[a[0]-X,a[1]-Y],[b[0]-X,b[1]-Y],[b[0]+X,b[1]+Y],[a[0]+X,a[1]+Y]]);
      }
      dots.push(...path.map(([x,y])=>rings(x,y,w,11)));
      cached={loops,dots,multipart:true};
    }
    const a=[...cached.loops.flat(),...(cached.dots||[]).flat()]; let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
    for(const [x,y] of a){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y)}
    cached.bounds=[xmin,xmax,ymin,ymax];polygons.set(p,cached);return cached;
  }
  function hitBounds(bounds,c){
    const [x1,x2,y1,y2]=bounds;
    return x1 < c.x+c.dx*.80 && x2 > c.x-c.dx*.80 && y1 < c.y+c.dy*.77 && y2 > c.y-c.dy*.77;
  }
  function createViewer(canvas,callback){
    const ctx=canvas.getContext('2d');
    let view={yaw:-.15,pitch:.65,zoom:1,camera:'plan',region:'overview',solo:'stage',xPan:0,yPan:0},
      payload=null, frame=0, size=[0,0], lastProj=null, active=null, dragStart=null;
    const ro=new ResizeObserver(()=>invalidate());ro.observe(canvas);
    const h=(e)=>[e.clientX,e.clientY];
    const reset=()=>{view={...view,zoom:1,yaw:-.15,pitch:.65,xPan:0,yPan:0};invalidate()};
    canvas.addEventListener('pointerdown',e=>{
      if(!payload)return;
      dragStart={client:h(e),view:{...view},pan:e.shiftKey||view.camera==='plan',drag:false};active=e.pointerId;
      try{canvas.setPointerCapture(e.pointerId)}catch{}
    });
    canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==active || !dragStart || !lastProj)return;
      const [dx,dy]=h(e).map((x,i)=>x-dragStart.client[i]);
      if(Math.abs(dx)+Math.abs(dy)>5)dragStart.drag=true;
      if(!dragStart.drag)return;
      if(dragStart.pan){
        view.xPan=dragStart.view.xPan-dx/(lastProj.s||1);
        view.yPan=dragStart.view.yPan+dy/(lastProj.s*lastProj.stretch||1);
      }else {
        view.yaw=Math.max(-1.03,Math.min(1.03,dragStart.view.yaw+dx*.006));
        view.pitch=Math.max(.20,Math.min(1.42,dragStart.view.pitch+dy*.005));
      }
      invalidate();
    });
    function un(e,click){
      if(e.pointerId!==active)return;
      if(click&&dragStart&&!dragStart.drag&&view.camera==='plan'&&lastProj){
        const r=canvas.getBoundingClientRect(),[x,y]=lastProj.deproject(e.clientX-r.left,e.clientY-r.top);
        const routes=payload.routes,v=view.region;
        if(v==='io'||v==='overview'&&x>21450&&y>-340&&y<1270){
          const n=Math.round((x-P.pinFirstX)/P.pitch)+1;
          if(n>0&&n<=32)callback(n);
        }else if(v==='mesh'||v==='site'||v==='section'||(v==='overview'&&x<7500)){
          let n=0,dd=Infinity; for(const t of routes){const d=Math.hypot(t.site[0]-x,t.site[1]-y);if(d<dd){dd=d;n=t.n}}
          if(dd<(v==='overview'?400:225)&&n)callback(n);
        }
      }
      dragStart=null;active=null;
      try{canvas.releasePointerCapture(e.pointerId)}catch{}
    }
    canvas.addEventListener('pointerup',e=>un(e,true));canvas.addEventListener('pointercancel',e=>un(e,false));
    canvas.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','0'].includes(e.key))return;
      e.preventDefault();
      if(e.key==='0'){reset();return;}
      if(e.key==='+'||e.key==='-')view.zoom=Math.min(4,Math.max(.55,view.zoom*(e.key==='+'?1.25:.8)));
      else if(view.camera==='plan') {
        const d=50/(lastProj?.s||1); 
        if(e.key==='ArrowLeft')view.xPan-=d;if(e.key==='ArrowRight')view.xPan+=d;
        if(e.key==='ArrowUp')view.yPan+=d;if(e.key==='ArrowDown')view.yPan-=d;
      }else{
        if(e.key==='ArrowLeft')view.yaw=Math.max(-1.03,view.yaw-.14);
        if(e.key==='ArrowRight')view.yaw=Math.min(1.03,view.yaw+.14);
        if(e.key==='ArrowUp')view.pitch=Math.min(1.42,view.pitch+.12);
        if(e.key==='ArrowDown')view.pitch=Math.max(.20,view.pitch-.12);
      }
      invalidate();
    });
    function invalidate(){if(!frame)frame=requestAnimationFrame(render)}
    const rgba=(c,aa)=>c+Math.max(0,Math.min(255,Math.round(aa*255))).toString(16).padStart(2,'0');
    function polyPath(c,xy,project,z,cont=false) {
      if(!cont)c.beginPath();
      for(let i=0;i<xy.length;i++){const p=project(xy[i][0],xy[i][1],z);if(i)c.lineTo(...p);else c.moveTo(...p);}
      c.closePath();
    }
    function projectFactory(c,w,h,camera,view,displaying){
      const stretch=c.stretch, a=camera==='plan'?0:view.yaw,b=camera==='plan'?0:view.pitch;
      const cos=Math.cos(a),sin=Math.sin(a),tilt=Math.cos(b),sk=Math.sin(b),
        margin=w<520?32:55, ht=h-92;
      const xW=Math.abs(c.dx*cos)+Math.abs(c.dy*stretch*sin);
      const baseY=Math.abs(c.dx*sin)+Math.abs(c.dy*stretch*cos);
      // Diagram elevation is assigned a bounded display budget independently of physical XY.
      const sh=k=>camera==='explode'?(explodedOffset[k]||0):0;
      const zLo=Math.min(...displaying.map(k=>Layer[k].lo+sh(k))),zHi=Math.max(...displaying.map(k=>Layer[k].hi+sh(k)));
      const span=Math.max(.2,zHi-zLo), zMid=(zLo+zHi)/2;
      const separation=camera==='explode'?Math.min((h-84)*.58,(c.stretch>1?92:126)*span):camera==='plan'?0:Math.min((h-84)*.16,40*span);
      const pxZ=separation/span;
      const s=Math.min((w-margin)/xW,Math.max(75,ht-separation)/(baseY*tilt))*view.zoom;
      const ctr=[w/2,h*.51+zMid*pxZ], x0=c.x+view.xPan,y0=c.y+view.yPan/stretch;
      const project=(x,y,z)=>{
        const X=x-x0,Y=(y-y0)*stretch;
        return [ctr[0]+(X*cos-Y*sin)*s,ctr[1]-(X*sin+Y*cos)*s*tilt-z*pxZ];
      };
      return {project,s,pxZ,stretch,deproject:(px,py)=>[x0+(px-ctr[0])/s,y0-(py-ctr[1])/s/stretch]};
    }
    function render(){
      frame=0;if(!ctx||!payload)return;
      const b=canvas.getBoundingClientRect(),w=b.width,h=b.height,R=Math.min(devicePixelRatio||1,2);
      if(!w||!h)return;
      if(size[0]!==w*R||size[1]!==h*R){canvas.width=Math.round(w*R);canvas.height=Math.round(h*R);size=[w*R,h*R];}
      ctx.setTransform(R,0,0,R,0,0);
      const group=payload.steps, state=payload.state, target=payload.target, row=state.rows[target-1],r=payload.routes.find(x=>x.n===target)||payload.routes[Math.floor(payload.routes.length/2)];
      const displaying=view.solo==='stage'?group:view.solo==='all'?['lower','gold','platinum','upper']:[view.solo];
      const c=conf(view.region,r,row),f=projectFactory(c,w,h,view.camera,view,displaying),p=f.project;lastProj=f;
      const gd=ctx.createLinearGradient(0,0,w,h);gd.addColorStop(0,'#09252c');gd.addColorStop(.53,'#0b181e');gd.addColorStop(1,'#173131');ctx.fillStyle=gd;ctx.fillRect(0,0,w,h);
      ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
      ctx.strokeStyle='#71949725';ctx.lineWidth=.65;ctx.beginPath();
      const tick=Math.pow(10,Math.floor(Math.log10(c.dx/9)));
      for(let a=Math.floor((c.x-c.dx*1.5+view.xPan)/tick)*tick;a<c.x+c.dx*1.5+view.xPan;a+=tick) {
        const z=-.55;ctx.moveTo(...p(a,c.y-c.dy*1.38+view.yPan/f.stretch,z));ctx.lineTo(...p(a,c.y+c.dy*1.38+view.yPan/f.stretch,z));
      }
      const ty=tick/f.stretch;
      for(let a=Math.floor((c.y-c.dy*1.45+view.yPan/f.stretch)/ty)*ty;a<c.y+c.dy*1.45+view.yPan/f.stretch;a+=ty) {
        const z=-.55;ctx.moveTo(...p(c.x-c.dx*1.5+view.xPan,a,z));ctx.lineTo(...p(c.x+c.dx*1.5+view.xPan,a,z));
      }
      ctx.stroke();

      const explode=explodedOffset;
      const m=payload.geometry;
      for(const k of displaying) {
        const l=Layer[k];if(!l)continue;
        const dz=view.camera==='explode'?(explode[k]||0):0;
        const zl=l.lo+dz,zh=l.hi+dz;
        const clip={...c,x:c.x+view.xPan,y:c.y+view.yPan/f.stretch,dx:c.dx*1.25/Math.min(view.zoom,1),dy:c.dy*1.25/Math.min(view.zoom,1)};
        ctx.lineJoin='round';ctx.lineCap='round';
        let group=m[k];
        for(const prim of group){
          const sh=drawPolygons(prim);
          if(!hitBounds(sh.bounds,clip))continue;
          const hi=prim.net===target&&(k==='gold'||k==='platinum');
          const col=prim.fault?'#f26d74':hi?(k==='gold'?'#fff0a6':'#f1fbff'):l.c;
          const pinrow=prim.pin?state.rows[prim.pin-1]:null;
          const sideAlpha=(k==='carrier'||k==='nickel')?.38:k==='upper'?.41:.69;
          const topAlpha=k==='carrier'?(view.camera==='plan'?.18:.47):
            k==='nickel'?(view.camera==='plan'?.22:.36):k==='upper'?(view.solo===k||view.camera==='explode'?.77:.46):
            k==='fixture'?.32:k==='lower'? .82:1;
          if(view.camera!=='plan' && prim.shape!=='stroke'){
            const pp=sh.loops[0];ctx.fillStyle=rgba(col,sideAlpha*.72);
            for(let i=0;i<pp.length;i++){const a=pp[i],b=pp[(i+1)%pp.length];
              ctx.beginPath();ctx.moveTo(...p(...a,zl));ctx.lineTo(...p(...b,zl));ctx.lineTo(...p(...b,zh));ctx.lineTo(...p(...a,zh));ctx.closePath();ctx.fill();}
          }
          // Keep fabrication layer mask holes as negative geometry, not white paint.
          if(!sh.multipart){
            sh.loops.forEach((u,i)=>polyPath(ctx,u,p,zh,i>0));ctx.fillStyle=rgba(col,topAlpha);ctx.fill('evenodd');
            if(k==='fixture'||(k==='platinum'&&hi)||(k==='upper'&&prim.hole&&prim.net===target)){
              ctx.lineWidth=(prim.pin===target||hi)?1.8:1;
              ctx.strokeStyle=k==='fixture'?(pinrow?.status==='good'?'#cafff1':pinrow?.status==='empty'?'#9d9dde':'#f6aece'):rgba(col,.9);
              ctx.stroke();
            }
          }else{
            ctx.beginPath();
            for(const u of [...sh.loops,...sh.dots])polyPath(ctx,u,p,zh,true);
            ctx.fillStyle=rgba(col,topAlpha);ctx.fill();
            if(hi||prim.fault){
              ctx.strokeStyle=rgba(col,hi?.45:.5);ctx.lineWidth=1.3;
              ctx.beginPath();prim.pts.forEach((u,i)=>i?ctx.lineTo(...p(...u,zh)):ctx.moveTo(...p(...u,zh)));ctx.stroke();
            }
          }
        }
      }
      function note(x,y,z,tag,color,dx,dy){
        const [px,py]=p(x,y,z); if(px<10||px>w-10||py<18||py>h-12)return;
        ctx.font='600 10px ui-monospace, monospace';const width=ctx.measureText(tag).width+12;
        const tx=Math.max(6,Math.min(w-width-6,px+dx)),ty=Math.max(30,Math.min(h-53,py+dy));
        ctx.lineWidth=.9;ctx.strokeStyle=rgba(color,.53);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(tx+(dx<0?width:0),ty+8);ctx.stroke();
        ctx.fillStyle='#0d2328eb';ctx.fillRect(tx,ty,width,18);ctx.fillStyle=color;ctx.fillText(tag,tx+6,ty+12);
      }
      function mark(x,y,z,t,stroke='#fff4b5',label=true){
        const [a,b]=p(x,y,z);if(a<0||a>w||b<0||b>h)return;
        ctx.lineWidth=1;ctx.strokeStyle=stroke;ctx.beginPath();ctx.arc(a,b,6,0,Math.PI*2);ctx.stroke();
        if(label)note(x,y,z,t,stroke,15,-30);
      }
      if(view.region==='overview'){
        if(state.stage===1&&view.solo==='stage'){
          // The incoming carrier is still blank. Show only a ghosted design plan registered to it.
          ctx.save();ctx.strokeStyle='#9dbbbb85';ctx.lineWidth=1;
          ctx.setLineDash([3,3]);
          for(const design of m.lower){
            if(design.shape==='stroke'&&(design.id.includes('-rail-')||design.id.includes('-brace-'))){
              ctx.beginPath();design.pts.forEach((u,i)=>i?ctx.lineTo(...p(...u,0)):ctx.moveTo(...p(...u,0)));ctx.stroke();
            }
          }
          const base=p(P.neckX,-332,0),end=p(37800,-4,0);
          ctx.strokeRect(base[0],end[1],end[0]-base[0],base[1]-end[1]);
          ctx.setLineDash([]);
          ctx.fillStyle='#9dbbbb60';ctx.lineWidth=.6;
          for(const pad of m.gold.filter(x=>x.id.startsWith('au-seat-'))){
            const q=p(pad.x,pad.y,0),q1=p(pad.x+pad.w,P.padY1,0);
            ctx.strokeRect(q[0],q1[1],q1[0]-q[0],q[1]-q1[1]);ctx.fillRect(q[0],q[1]-5,q1[0]-q[0],5);
          }
          ctx.restore();
        }
        const z=view.camera==='explode'?.95:.61;
        note(3200,60,z,'OPEN MESH','#e9b978',w<500?-8:-28,-36);
        note(16100,-162,z,'THIN STEM','#b0dfd0',-16,34);
        note(27900,745,z,'ZIF PAD FIELD','#ddafe3',-14,-47);
      }
      if(view.region==='mesh'&&displaying.includes('platinum'))mark(r.site[0]+state.options.ptShift,r.site[1],Layer.platinum.hi+(view.camera==='explode'?explode.platinum:0),r.ids.site,'#eafaff');
      if(view.region==='site'||view.region==='section'){
        const [x,y]=r.site;
        if(displaying.includes('platinum'))mark(x+state.options.ptShift,y,Layer.platinum.hi+(view.camera==='explode'?explode.platinum:0),r.ids.site+' · Pt','#eafaff');
        if(displaying.includes('upper'))note(x,y,Layer.upper.hi+(view.camera==='explode'?explode.upper:0),'M4 WINDOW','#9be8d5',-100,-21);
        if(view.region==='section'&&view.camera==='explode'){
          if(displaying.includes('lower'))note(x-3,y,Layer.lower.hi,'M1 SUPPORT','#f4c78e',w<430?-79:-125,11);
          if(displaying.includes('gold'))note(x+38,r.points[1][1],Layer.gold.hi+explode.gold,'M2 ROUTE','#ffe19d',w<430?4:34,16);
        }
      }
      if(view.region==='io'){
        const z=Layer.fixture.hi+(view.camera==='explode'?explode.fixture:0);
        if(displaying.includes('fixture'))mark(row.pinX,row.pinY,z,row.physicalPin+(row.label!==row.physicalPin?' → '+row.label:''),'#f6cded');
        const x=P.pinFirstX+(target-1)*P.pitch;
        if(displaying.includes('gold'))note(x,764,Layer.gold.hi+(view.camera==='explode'?explode.gold:0),'A'+String(target).padStart(2,'0')+' PAD','#f9d78e',-70,-28);
      }
      ctx.restore();
      ctx.fillStyle='#0b1a20e8';ctx.fillRect(0,0,w,28);ctx.fillRect(0,h-27,w,27);
      ctx.font='10px ui-monospace, monospace';ctx.fillStyle='#b4d9d3';
      ctx.fillText(views[view.region].toUpperCase()+' / '+(view.camera==='plan'?'XY':view.camera==='explode'?'EXPLODED Z':'OBLIQUE Z'),11,18);
      ctx.textAlign='right';ctx.fillStyle='#9fbbbc';ctx.fillText(view.camera==='plan'&&view.region!=='overview'?'XY · µm':view.region==='overview'?'ENLARGED TRANSVERSE SCALE':'Z HEIGHT EXAGGERATED',w-10,18);ctx.textAlign='left';
      if(view.camera==='plan'&&view.region!=='overview'){
        const targetPx=75;let l=[1,2,5].map(c=>c*10**Math.floor(Math.log10(targetPx/f.s))).concat([10**Math.ceil(Math.log10(targetPx/f.s))]).find(x=>x*f.s>=targetPx*.73)||100;
        ctx.strokeStyle='#a7cecb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(12,h-13);ctx.lineTo(12+l*f.s,h-13);ctx.moveTo(12,h-16);ctx.lineTo(12,h-10);ctx.moveTo(12+l*f.s,h-16);ctx.lineTo(12+l*f.s,h-10);ctx.stroke();ctx.fillStyle='#b7cccd';ctx.fillText(l>=1000?(l/1000)+' mm':l+' µm',20+l*f.s,h-10);
      }else{
        ctx.fillStyle='#b7cccd';ctx.fillText(view.region==='overview'?(state.stage===1&&view.solo==='stage'?'Dashed artwork · not fabricated':'XY aspect adjusted for inspection'):'Layer elevation is a visual diagram',11,h-10);
      }
      ctx.textAlign='right';ctx.fillStyle='#a3c5c4';ctx.fillText(w<430?(view.camera==='plan'?'DRAG TO PAN':'DRAG TO ORBIT'):(view.camera==='plan'?'DRAG TO PAN · TAP A SITE OR PIN':'DRAG TO ORBIT · SHIFT DRAG TO PAN'),w-11,h-10);ctx.textAlign='left';
    }
    return {get state(){return {...view}},load(x){payload=x;invalidate()},set(values,resetPosition=false){view={...view,...values};if(resetPosition)reset();else invalidate();},reset,
      zoom(d){view.zoom=Math.min(4,Math.max(.55,view.zoom*d));invalidate()}};
  }
  globalThis.MeshView={createViewer,views,drawPolygons};
})();
