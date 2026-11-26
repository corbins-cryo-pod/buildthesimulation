import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const src='/equipment/11-01/';
const {initial,act,load,info}=await import(/* @vite-ignore */new URL(src+'solver.mjs',location.origin).href);
const top=document.querySelector('#doric11-exhibit'),el=k=>top.querySelector('#doric11-'+k);
let data=null,s=initial(),repaint=()=>{};
const status=(m,e=false)=>{el('status').textContent=m;el('status').dataset.error=String(e);};
function dispatch(a,v){if(!data)return;const u=act(data,s,a,v);s=u.state;status(u.message,!u.ok);sync();}
function draw(c){
 if(!data)return;
 const g=c.getContext('2d'),q=info(data,s),w=c.width,h=c.height;
 g.fillStyle='#f1e9da';g.fillRect(0,0,w,h);
 g.font='bold '+Math.round(w*.047)+'px system-ui';g.fillStyle='#214653';g.textAlign='center';
 g.fillText(q.cardId+' COUNT CARD',w*.5,h*.16);g.textAlign='start';
 const colors=['#237582','#9c562f','#545281'],pos=[.31,.49,.67],r=w*.019;
 for(const [i,m] of q.marks.entries()){
  const y=h*pos[i];g.fillStyle=colors[i];g.font='bold '+Math.round(w*.032)+'px system-ui';g.fillText(m.symbol,w*.058,y+r*.37);
  for(let j=0;j<m.count;j++){
   const x=w*(.25+j*.060);g.beginPath();
   if(i===0)g.arc(x,y,r,0,Math.PI*2);
   if(i===1)g.rect(x-r,y-r,2*r,2*r);
   if(i===2){g.moveTo(x,y-r*1.15);g.lineTo(x+r*1.15,y);g.lineTo(x,y+r*1.15);g.lineTo(x-r*1.15,y);g.closePath();}
   g.fill();
  }
  g.textAlign='right';g.fillText(m.share===null?'—':(100*m.share)+'%',w*.93,y+r*.37);g.textAlign='start';
 }
 g.strokeStyle='#a19987';g.lineWidth=w*.003;g.beginPath();g.moveTo(.055*w,.76*h);g.lineTo(.945*w,.76*h);g.stroke();
 g.fillStyle='#273d4a';g.fillText(q.total?'TOTAL: '+q.total+' MARKS':'NO MARKS · SHARE UNDEFINED',w*.058,h*.88);
}
function sync(){
 el('card').value=s.index;el('next').disabled=el('export').disabled=!data;if(!data)return;
 const q=info(data,s);
 el('result').textContent=q.cardId+' · total '+q.total+' · '+(q.total?q.marks.map(m=>m.symbol+' '+(m.share*100)+'%').join(' · '):'all shares undefined.');
 draw(el('diagram'));repaint();
}
for(const a of ['next','reset'])el(a).onclick=()=>dispatch(a);
el('card').onchange=e=>dispatch('select',Number(e.currentTarget.value));
el('export').onclick=()=>{
 if(!data)return;const q=info(data,s),href=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download=q.archiveId+'-'+q.cardId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
async function viewer(){
 const host=el('view'),sc=new T.Scene(),cam=new T.PerspectiveCamera(41,1,.016,15),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));sc.background=new T.Color('#263949');host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Dormant Doric LEDD_1 enclosure and detached arithmetic exhibit.');
 const ctr=new OrbitControls(cam,r.domElement),draw3=()=>r.render(sc,cam);
 ctr.minDistance=.07;ctr.maxDistance=2;ctr.addEventListener('change',draw3);
 sc.add(new T.HemisphereLight(0xffffff,0x98a3aa,2.3));
 for(const [a,i] of [[[1.5,4,4],2.4],[[-3,3,-2],1.5]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);sc.add(l);}
 const grid=new T.GridHelper(1.2,24,0x748c99,0x536977);grid.position.y=-.004;sc.add(grid);
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(src+'doric-ledd1.glb'),fetch(src+'interaction.json').then(r=>r.json())]);
 sc.add(asset.scene);const get=n=>{const a=[];asset.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Invalid model binding: '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);
 const a=m.actions[0],panel=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));sc.add(proxy);panel.getWorldPosition(proxy.position);
 const raster=document.createElement('canvas');raster.width=532;raster.height=324;
 const tex=new T.CanvasTexture(raster);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
 const display=new T.Mesh(new T.PlaneGeometry(.126,.0767),new T.MeshBasicMaterial({map:tex}));display.position.z=.008;panel.add(display);
 const rc=new T.Raycaster(),xy=new T.Vector2();let down=null,tag='';
 function hit(e){if(cam.position.z<.045)return false;const b=r.domElement.getBoundingClientRect();xy.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);rc.setFromCamera(xy,cam);return Boolean(rc.intersectObject(proxy)[0]);}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))dispatch(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the dormant cabinet';};
 repaint=()=>{const k=String(s.index);if(k!==tag&&data){draw(raster);tex.needsUpdate=true;tag=k;}draw3();};
 const poses={orbit:[[.21,.235,.51],[-.052,.050,.015]],front:[[.062,.16,.275],[.063,.025,.012]],archive:[[-.154,.119,.24],[-.154,.090,.029]],side:[[.24,.096,.22],[.064,.022,0]]};
 const pose=k=>{cam.position.fromArray(poses[k][0]);ctr.target.fromArray(poses[k][1]);ctr.update();draw3();};
 top.querySelectorAll('[data-doric11-view]').forEach(x=>x.onclick=()=>pose(x.dataset.doric11View));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3();}}).observe(host);
 pose('orbit');repaint();el('model').textContent='Metric GLB loaded · Dormant enclosure and detached archive';el('model').dataset.loaded='true';
}
sync();
load().then(f=>{data=f;status('Ready: fixed abstract reference card.');sync();}).catch(e=>status(e.message,true));
viewer().catch(e=>{el('model').textContent='3D unavailable: '+e.message+'. The independent count cards remain usable.';el('view').hidden=true;});
