import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/08-05/',link=new URL(path+'solver.mjs',location.origin).href;
const {initial,dispatch,csv}=await import(/* @vite-ignore */ link);
const app=document.querySelector('#fl300'),$=k=>app.querySelector('#fl-'+k),f=(x,n=4)=>Number(x.toFixed(n)).toString();let s=initial(),out=null,repaint=()=>{};
function status(t,e=false){$('status').textContent=t;$('status').dataset.error=String(e);}
function act(a,v){const q=dispatch(s,a,v);if(!q.ok){if(a==='sweep')out=null;status(q.message,true);return sync();}s=q.state;out=q.result??null;status(out?'Calculated '+out.data.length+' alignment samples.':a==='center'?'Moved to the registered optical axes.':'Setting applied.');sync();}
for(const k of ['power','cover','head','load','center','sweep','reset'])$(k).onclick=()=>act(k);
for(const k of ['dx','dy'])$(k).onchange=e=>act('settings',{[k]:e.target.valueAsNumber});
$('file').onchange=async e=>{const a=e.target.files[0];if(!a)return;try{if(a.size>16000)throw Error('Use a fixture JSON below 16 kB.');act('import',JSON.parse(await a.text()));}catch(err){status('Import: '+err.message,true);}e.target.value='';};
function save(j){if(!out)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([j?JSON.stringify(out):csv(out)],{type:j?'application/json':'text/csv'}));a.href=u;a.download='fl300-'+out.runRevision+(j?'.json':'.csv');a.click();setTimeout(()=>URL.revokeObjectURL(u),800);}
$('json').onclick=()=>save(true);$('csv').onclick=()=>save(false);
function plot(){
 const c=$('plot'),g=c.getContext('2d'),l=76,t=54,r=c.width-28,b=c.height-61;
 g.fillStyle='#142d3b';g.fillRect(0,0,c.width,c.height);g.fillStyle='#bcece8';g.font='bold 22px sans-serif';g.fillText('FL300 / SYNTHETIC MODE OVERLAP',20,35);
 const lo=Math.min(out?.data[0].stageXUm??-20,out?.pose.stageXUm??-20),hi=Math.max(out?.data.at(-1).stageXUm??20,out?.pose.stageXUm??20), X=x=>l+(x-lo)/(hi-lo)*(r-l),Y=y=>b-y*(b-t);
 g.font='15px sans-serif';g.strokeStyle='#4f6877';g.lineWidth=1;
 for(let i=0;i<=4;i++){const x=l+i*(r-l)/4,y=t+i*(b-t)/4;g.beginPath();g.moveTo(x,t);g.lineTo(x,b);g.moveTo(l,y);g.lineTo(r,y);g.stroke();g.fillText(f(lo+(hi-lo)*i/4,1),x-9,b+22);g.fillText(String(100-25*i)+'%',9,y+5);}
 g.fillText('Lateral stage position, µm · at selected transverse Y',l,b+50);
 if(!out)return;
 g.strokeStyle='#88e9cf';g.lineWidth=3;g.beginPath();
 out.data.forEach((p,i)=>i?g.lineTo(X(p.stageXUm),Y(p.powerFraction)):g.moveTo(X(p.stageXUm),Y(p.powerFraction)));g.stroke();
 g.fillStyle='#ffd883';g.beginPath();g.arc(X(out.pose.stageXUm),Y(out.pose.powerFraction),5.8,0,2*Math.PI);g.fill();
}
function sync(){
 $('dx').value=s.dx;$('dy').value=s.dy;$('cover').textContent=s.closed?'Open virtual guard':'Close virtual guard';$('cover').setAttribute('aria-pressed',String(!s.closed));$('power').textContent=s.power?'Standby':'Power on';$('head').textContent=s.headDown?'Park pickup head':'Lower pickup head';$('load').textContent=s.loaded?'Remove witness':'Load witness';
 $('sample').textContent=s.loaded?s.fixture.sampleId+' · revision '+s.fixture.revision:'Witness not loaded.';
 $('json').disabled=$('csv').disabled=!out;
 $('result').textContent=out?'Pose: '+f(100*out.pose.powerFraction,2)+'% modeled power · sweep peak '+f(100*out.peakAtCurrentY.powerFraction,2)+'% at X = '+f(out.peakAtCurrentY.stageXUm)+' µm.':'Sweep to measure the ideal optical overlap.';
 $('pads').textContent=out?(out.pads.length?out.pads.map(p=>p.emitterId+' → '+p.receiverId+': '+f(100*p.fraction,2)+'% geometric overlap').join(' · '):'No pad pairs provided.'):'';
 plot();repaint();
}
async function viewer(){
 const host=$('viewer'),sc=new T.Scene(),c=new T.PerspectiveCamera(40,1,.006,14),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.outputColorSpace=T.SRGBColorSpace;sc.background=new T.Color('#263741');host.append(r.domElement);r.domElement.setAttribute('aria-label','Metric open-deck FL300 reconstruction with an operable virtual guard and pickup head.');
 const orbit=new OrbitControls(c,r.domElement),draw=()=>r.render(sc,c);orbit.minDistance=.2;orbit.maxDistance=6;orbit.addEventListener('change',draw);
 sc.add(new T.HemisphereLight(0xffffff,0x748287,2.1));for(const [p,i] of [[[1.3,1.9,1.4],2],[[-1.2,1.7,-1.2],1.35]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(p);sc.add(l);}
 const grid=new T.GridHelper(3.5,28,0x668e96,0x52666b);grid.position.y=-.003;sc.add(grid);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(path+'fl300.glb'),fetch(path+'interaction.json').then(r=>r.json())]);sc.add(g.scene);
 const get=n=>{const a=[];g.scene.traverse(o=>{if(o.name===n)a.push(o)});if(a.length!==1)throw Error('Missing or ambiguous model node '+n);return a[0];};
 get(m.frame.placementAnchor);m.ports.forEach(get);get(m.parts.emitterAxis);get(m.parts.receiverAxis);
 const guard=get(m.parts.guard),head=get(m.parts.head),park=head.position.y,dev=get(m.parts.receiver),rest=dev.position.clone(),sample=get(m.parts.subject);
 const targets=m.actions.map(q=>{const p=new T.Mesh(new T.BoxGeometry(...q.sizeM),new T.MeshBasicMaterial({visible:false}));p.userData.q=q;sc.add(p);return [get(q.node),p];});
 const ray=new T.Raycaster(),v=new T.Vector2();let down=null;
 function hit(e){if(c.position.z<.04)return null;const b=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);return ray.intersectObjects(targets.map(x=>x[1]))[0]?.object.userData.q;}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const q=hit(e);if(q)act(q.action);}down=null;};
 r.domElement.onpointermove=e=>{const q=hit(e);r.domElement.style.cursor=q?'pointer':'grab';r.domElement.title=q?.label??'Orbit the FL300';};
 repaint=()=>{guard.rotation.y=s.closed?0:m.motion.guardOpenDeg*Math.PI/180;head.position.y=park-(s.headDown?m.motion.headApproachM:0);sample.visible=s.loaded;dev.position.copy(rest);if(Number.isFinite(s.dx)&&Number.isFinite(s.dy)){dev.position.x+=s.dx*1e-6;dev.position.y+=s.dy*1e-6;}sc.updateMatrixWorld(true);for(const [n,p] of targets){n.getWorldPosition(p.position);p.updateMatrixWorld(true);}draw();};
 const poses={orbit:[[1.29,1.66,2.72],[.24,.90,.02]],front:[[0,1.30,2.36],[0,.94,.11]],stage:[[.50,1.51,1.03],[0,1.12,.14]],rear:[[.65,1.48,-2.53],[.13,.82,-.05]]};
 function pose(k){c.position.fromArray(poses[k][0]);orbit.target.fromArray(poses[k][1]);orbit.update();draw();}
 app.querySelectorAll('[data-fl-view]').forEach(b=>b.onclick=()=>pose(b.dataset.flView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();draw();}).observe(host);
 pose('orbit');repaint();$('model').textContent='Metric GLB loaded · visual guard, pickup head and alignment stage';$('model').dataset.loaded='true';
}
sync();act('sweep');viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'. The numerical fixture still works.';$('viewer').style.display='none';});
