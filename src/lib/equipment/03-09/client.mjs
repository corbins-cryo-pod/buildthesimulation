import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,carriers,exportFile,poses,targets} from '../../../../public/equipment/03-09/fit.mjs';
const S=createStation(),$=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';let update=()=>{};
const deg={clear:['#7db5a0','Fits with positive clearance'], touch:['#ccbd78','Touches boundary: no positive clearance'], blocked:['#d79e82','Blocked by the gauge opening']};
function diagram(s){
 const m=carriers[s.selected],c=s.result,q=$('fit-plot');q.replaceChildren();
 function node(tag,attrs,txt){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(txt)e.textContent=txt;q.append(e);}
 const v=6.3,x=150,y=96,w=m.widthMm*v,h=m.heightMm*v;
 node('circle',{cx:x,cy:y,r:11*v,fill:'#f7f4e8',stroke:'#5a7c77','stroke-width':'2'});
 node('path',{d:'M150 19V173 M73 96H227',stroke:'#9eaca5','stroke-dasharray':'4 4'});
 node('rect',{x:x-w/2,y:y-h/2,width:w,height:h,fill:(c&&deg[c.outcome][0])||'#cad1c5','fill-opacity':'.75',stroke:'#455f60','stroke-width':'2'});
 node('path',{d:'M'+(x-w/2)+' '+(y+h/2)+'L'+(x+w/2)+' '+(y-h/2),stroke:'#455f60','stroke-dasharray':'4 4'});
 node('text',{x:12,y:18,'font-family':'system-ui','font-size':'10',fill:'#344c4c'},'Mock gauge Ø22 mm');
}
function refresh(s){
 const m=carriers[s.selected],r=s.result;
 $('carrier').value=s.selected;$('export').disabled=!r;$('cutaway').textContent=s.cutaway?'Show exterior lid':'Hide exterior lid for inspection';
 $('status').textContent=s.error??(r?deg[r.outcome][1]+'. Signed radial clearance: '+r.radialGapMm.toFixed(3)+' mm.':m.widthMm+' × '+m.heightMm+' mm carrier selected. Check its radial clearance.');
 $('details').textContent=r?'Centered diagonal: '+r.diagonalMm.toFixed(3)+' mm · inspection revision '+s.revision+'.':'Gauge inside diameter: 22 mm. Values are nominal, without a manufacturing tolerance.';
 diagram(s);update();
}
function act(k,p){refresh(S.dispatch(k,p));}
$('carrier').onchange=e=>act('select',e.target.value);$('check').onclick=()=>act('check');$('cutaway').onclick=()=>act('cutaway');$('reset').onclick=()=>act('reset');
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(exportFile(S.read()),null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='mini-mite-dry-fit.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
async function model(){
 const c=$('instrument'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#273d43');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.001,9),o=new OrbitControls(cam,c);o.minDistance=.05;o.maxDistance=2.5;
 scene.add(new T.HemisphereLight('#f1fcff','#d6c4ae',2.6));
 for(const [xyz,k,col]of [[[1,2,1.4],3.15,'#fff0d8'],[[-1,.7,-1],2.1,'#d0ecff']]){const l=new T.DirectionalLight(col,k);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/03-09/mini-mite-display.glb')).scene;scene.add(m);
 const render=()=>r.render(scene,cam),lid=m.getObjectByName('Documentary_upper_shell');
 const groups=Object.fromEntries(Object.values(carriers).map(x=>[x.node,m.getObjectByName(x.node)]));
 update=()=>{const s=S.read();lid.visible=!s.cutaway;for(const x of poses(s))groups[x.node].position.set(...x.positionM);render();};
 const cams={whole:[[.55,.42,.82],[.08,.185,.019]],end:[[.75,.22,.25],[.04,.208,.028]],gauge:[[.385,.15,.296],[.285,.069,.094]],rear:[[-.54,.36,-.78],[.035,.18,0]]};
 function set(k){const [x,y]=cams[k]??cams.whole;cam.position.set(...x);o.target.set(...y);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let start;c.onpointerdown=e=>start=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>4)return;const b=c.getBoundingClientRect(),q=new T.Raycaster();q.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of q.intersectObject(m,true)){let g=h.object,k=null,v=true;while(g){if(!g.visible)v=false;if(!k&&Object.hasOwn(targets,g.name))k=targets[g.name];g=g.parent;}if(k&&v){act(...k);return;}}
 };
 set('whole');update();c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · documentary cabinet and separate inert gauge.';
}
refresh(S.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Clearance checks and export still work.';});
