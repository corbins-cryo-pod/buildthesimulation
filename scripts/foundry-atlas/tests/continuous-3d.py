#!/usr/bin/env python3
"""Acceptance and screenshot evidence for the three-dimensional Foundry walkthrough.

Run from any checkout, with the project's pre-existing Chromium if available:
  CHROME_BIN=/path/to/chrome python scripts/foundry-atlas/tests/continuous-3d.py \
      --artifacts /tmp/foundry-3d-qa
Real-time end-to-end export checks (optional, several minutes each):
  python scripts/foundry-atlas/tests/continuous-3d.py --cases journey_mas journey_np
An installed Playwright browser can also be selected with --engine webkit|firefox.
The iPhone profile emulates a touch viewport; it is *not* a physical Safari test.

Routes launch through their real native controls. A separate ephemeral HTTP document
calls the public player API with the real Masmanidis stage records for deterministic
frame-by-frame geometry checks. The observer samples *rendered* Three scenes, not
merely canvas or UI attributes, and does not alter their models or frame clocks.
"""
import argparse
import contextlib
import functools
import hashlib
import http.server
import io
import json
import math
import os
from pathlib import Path
import sys
import threading
import traceback
import time
import zipfile

from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[3]
WORLD='canvas[data-cleanroom-world]'
MAS='/simulations/masmanidis-64d-foundry/'
ATLAS='/simulations/foundry/atlas/'
ALL=('geometry','program','carrier','entries','native','atlas','faults','mobile','lifecycle')
EXTENDED=('journey_mas','journey_np','receivers','native_hold','reticle_phone','stage_matrix')
browser=None
OUT=None
TRACE=[]
OUTCOMES=[]
LABS=json.loads((ROOT/'src/data/foundry-atlas/lab-releases.json').read_text())
TIMEOUT=25000

# No instrumentation is needed in the app: read the graph delivered to
# WebGLRenderer.render(). Hold only the most recent scenes on their owning canvas.
PROBE=r"""async()=>{
 const T=await import('/vendor/three/three.module.js');
 if(window.__qa3d)return;
 const orig=T.Scene.prototype.onBeforeRender, frame=new WeakMap(),seen=[];let lastStamp='';
 T.Scene.prototype.onBeforeRender=function(renderer,scene,camera,...args){
   const c=renderer.domElement,role=scene.userData.role;
   if(c?.hasAttribute('data-cleanroom-world')&&role?.startsWith('cleanroom-')){
     let map=frame.get(c);
     if(!map){map=new Map();frame.set(c,map);}
     map.set(role,{scene,camera:camera.clone(),renderer,camPos:camera.position.toArray(),projection:camera.projectionMatrix.clone()});
     if(role==='cleanroom-world'){
       const ds=c.dataset,phase=c.closest('.cr-room')?.dataset.phase,key=[ds.trackId,ds.bay,phase,ds.stageModel,ds.fit,ds.carrier,ds.artifactId,ds.specimen].join('|');
       if(lastStamp!==key&&seen.length<2000){lastStamp=key;seen.push({t:+performance.now().toFixed(1),phase,...ds});}
     }
   }
   if(orig)return orig.call(this,renderer,scene,camera,...args);
 };
 const arr=(v)=>v.toArray().map(x=>+x.toFixed(6));
 function summarize(node,cam){
   const b=new T.Box3().makeEmpty(), geometries=[],frontages=[];
   let localSolid=0,triangles=0;
   if(!node)return null;
   node.traverseVisible(n=>{
     if(!n.isMesh||!n.geometry?.attributes?.position)return;
     let g=n.geometry;if(!g.boundingBox)g.computeBoundingBox();
     let bb=g.boundingBox?.clone();if(!bb||bb.isEmpty())return;
     if(n.isInstancedMesh){n.computeBoundingBox();if(n.boundingBox)bb=n.boundingBox.clone();}
     const loc=bb.getSize(new T.Vector3());
     if(Math.min(loc.x,loc.y,loc.z)>1e-8)localSolid++;
     bb.applyMatrix4(n.matrixWorld);b.union(bb);
     geometries.push(n.name+'|'+g.uuid+'|'+n.visible+'|'+(n.material?.color?.getHexString()||'')+'|'+arr(n.scale));
     const d=bb.getSize(new T.Vector3());
     frontages.push({name:n.name,d:arr(d)});
     triangles+=(g.index?.count||g.attributes.position.count)/3*(n.isInstancedMesh?n.count:1);
   });
   const c=b.isEmpty()?node.getWorldPosition(new T.Vector3()):b.getCenter(new T.Vector3());
   const ndc=c.clone().project(cam);const pitch=[];
   if(!b.isEmpty()){
     for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])
       pitch.push(new T.Vector3(x,y,z).project(cam).toArray());
   }
   const within=pitch.length>0&&!pitch.every(v=>v[0]<-1)&&!pitch.every(v=>v[0]>1)&&!pitch.every(v=>v[1]<-1)&&!pitch.every(v=>v[1]>1)&&!pitch.every(v=>v[2]<-1)&&!pitch.every(v=>v[2]>1);
   return {uuid:node.uuid,rootVisible:node.visible,meshCount:geometries.length,localSolid,triangles,
     size:b.isEmpty()?[0,0,0]:arr(b.getSize(new T.Vector3())),position:arr(node.getWorldPosition(new T.Vector3())),
     center:arr(c),ndc:arr(ndc),intersects:within,
     edges:pitch.length?[Math.min(...pitch.map(v=>v[0])),Math.max(...pitch.map(v=>v[0])),Math.min(...pitch.map(v=>v[1])),Math.max(...pitch.map(v=>v[1]))]:null,
     projWidth:pitch.length?Math.max(...pitch.map(v=>v[0]))-Math.min(...pitch.map(v=>v[0])):0,
     projHeight:pitch.length?Math.max(...pitch.map(v=>v[1]))-Math.min(...pitch.map(v=>v[1])):0,
     shape:geometries.join(';'),largest:frontages.sort((a,b)=>(b.d[0]*b.d[2])-(a.d[0]*a.d[2])).slice(0,4)};
 }
 function one(canvas,role='cleanroom-world'){
   const f=frame.get(canvas)?.get(role);if(!f)return null;
   const {scene:s,camera:cam,renderer:r}=f;
   const n=s.getObjectByProperty('name','Persistent wafer and workpiece')||s.children.find(x=>['inspection-specimen','reticle-detail'].includes(x.userData?.role));
   const bay=s.children.find(x=>x.userData.role==='equipment-bay'&&String(x.userData.bay)===canvas.dataset.bay);
   const models=[];
   if(bay)bay.traverseVisible(x=>{if(x.userData.role==='equipment'){
     models.push({name:x.name,id:x.userData.equipmentId||null,asset:x.userData.assetUrl||null,modelClass:x.userData.modelClass||null,geometry:summarize(x,cam)?.meshCount||0});
   }});
   const device=(tag)=>{
     if(!bay)return null;
     const y=bay.getObjectByName(tag);return y?{pos:arr(y.position),rot:arr(new T.Vector3(y.rotation.x,y.rotation.y,y.rotation.z)),visible:y.visible}:null;
   };
   const anchor=(role)=>{
    const o=s.children.find(y=>y.userData?.role===role);if(!o)return null;
    return {uuid:o.uuid,visible:o.visible,position:arr(o.position),rotation:arr(o.quaternion),
      artifactId:o.userData.artifactId||null,attached:o.userData.attached,geometry:summarize(o,cam)};
  };
  function selectedSize(prefix){
    let n=null;s.traverseVisible(x=>{if(x.name.startsWith(prefix))n=x;});
    if(!n?.geometry||!n.isMesh)return null;
    const g=n.geometry,idx=g.getIndex(),v=g.attributes.position,b=new T.Box3().makeEmpty(),lo=g.drawRange.start,hi=Math.min(idx?.count??v.count,lo+g.drawRange.count);
    for(let k=lo;k<hi;k++)b.expandByPoint(new T.Vector3().fromBufferAttribute(v,idx?idx.getX(k):k).applyMatrix4(n.matrixWorld).project(cam));
    if(b.isEmpty())return null;
    return [(b.max.x-b.min.x)*canvas.clientWidth/2,(b.max.y-b.min.y)*canvas.clientHeight/2];
  }
  const consoleNode=s.children.find(x=>x.userData.role==='setup-console');
   const screen=consoleNode?.getObjectByProperty('name','Simulation-only readout');
   const panel=consoleNode?{...consoleNode.userData,visible:consoleNode.visible,
     textured:!!screen?.material?.map?.image,textureVersion:screen?.material?.map?.version??null,
     screen:consoleNode.visible?summarize(screen,cam):null}:null;
   return {
     sitePx:role==='cleanroom-reticle'?selectedSize('Selected physical'):null,bondPx:role==='cleanroom-reticle'?selectedSize('Its independent die bond pad'):null,
     net:(()=>{const n=s.getObjectByName('Selected net: tint is a diagnostic overlay, not a material');return n?{visible:n.visible,drawRange:{...n.geometry.drawRange},id:n.uuid}:null;})(),
     toolCarrier:anchor('temporary-wafer-support'),fieldLocator:anchor('selected-reticle-field'),
     workRotation:n?arr(n.quaternion):null,carrierState:canvas.dataset.carrier,artifactId:canvas.dataset.artifactId,panel,role,scene:s.uuid,cam:cam.uuid,camPos:f.camPos,track:canvas.dataset.trackId,bay:canvas.dataset.bay,
     mode:canvas.dataset.mode,fit:canvas.dataset.fit,equipment:canvas.dataset.equipment,stageKind:canvas.dataset.stageKind,
     stageModel:canvas.dataset.stageModel,spec:canvas.dataset.specimen,feature:canvas.dataset.feature,face:canvas.dataset.waferFace,inset:canvas.dataset.sectionInset,
     w:canvas.width,h:canvas.height,models,piece:summarize(n,cam),
     native:{transport:device('transport'),carrier:device('carrier'),lid:device('lid_pivot')},
     info:{draws:r.info.render.calls,triangles:r.info.render.triangles,geometries:r.info.memory.geometries,textures:r.info.memory.textures}
   };
 }
 // Raycast through the real camera against visible opaque meshes. A wafer behind
 // a closed native component legitimately disappears; its unobstructed staging
 // and transfer, on the other hand, must be optically visible, not just in the DOM.
 function occlusion(canvas){
  const f=frame.get(canvas)?.get('cleanroom-world');if(!f)return null;
  const root=f.scene.getObjectByProperty('name','Persistent wafer and workpiece');
  const wafer=new Set();root.traverseVisible(n=>{if(n.isMesh)wafer.add(n);});
  const piece=summarize(root,f.camera);if(!piece.edges)return null;
  const [l,r,b,t]=piece.edges;let hit=0,visible=0;
  const obstacles=[];f.scene.traverseVisible(n=>{
    if(n.isMesh&&!wafer.has(n)&&n.material&&!Array.isArray(n.material)&&n.material.visible!==false&&n.material.opacity>.65)obstacles.push(n);
  });
  const ray=new T.Raycaster(),pt=new T.Vector2();
  for(let y=0;y<6;y++)for(let x=0;x<8;x++){
    pt.set(l+(r-l)*(x+.5)/8,b+(t-b)*(y+.5)/6);ray.setFromCamera(pt,f.camera);
    const target=ray.intersectObjects([...wafer],false)[0];if(!target)continue;
    hit++;
    const fg=ray.intersectObjects(obstacles,false).some(z=>z.distance<target.distance-1e-4);
    if(!fg)visible++;
  }
  return {samples:hit,visible,ratio:hit?visible/hit:0,cssWidth:(r-l)*canvas.clientWidth/2,cssHeight:(t-b)*canvas.clientHeight/2};
 }
 window.__qa3d={history:()=>seen.slice(),one:(role='cleanroom-world')=>one(document.querySelector('canvas[data-cleanroom-world]'),role),occlusion:()=>occlusion(document.querySelector('canvas[data-cleanroom-world]')),identity:()=>{
  const c=document.querySelector('canvas[data-cleanroom-world]');const s=frame.get(c)?.get('cleanroom-world')?.scene;
  return s?[s.uuid,s.getObjectByProperty('name','Persistent wafer and workpiece')?.uuid]:[];}};
}"""

HARNESS='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Foundry renderer QA document</title><style>body{margin:0;padding:6px;background:#202e2f;color:white;font-family:system-ui}main{max-width:1160px;margin:0 auto}</style><main id="qa-rig"></main></html>'''

def require(ok,reason):
 if not ok:raise AssertionError(reason)

def norm(a,b):
 return math.dist(a,b)

def compact(v):
 if isinstance(v,dict):return {k:compact(w) for k,w in v.items() if k not in ('shape','largest')}
 if isinstance(v,list):return [compact(x) for x in v]
 return v

def marker(page):
 return page.locator('.cr-room').first

def screenshot(page,tag):
 if not OUT:return
 OUT.mkdir(parents=True,exist_ok=True)
 c=marker(page).locator(WORLD)
 if c.count() and c.is_visible():
  raw=c.screenshot(animations='allow')
  (OUT/(tag+'.png')).write_bytes(raw)
  # Image entropy detects blank/clear-only frames but does not replace visual inspection.
  try:
   from PIL import Image,ImageStat
   im=Image.open(io.BytesIO(raw)).convert('RGB').resize((96,64))
   st=ImageStat.Stat(im)
   require(max(st.stddev)>6,(tag,'3D canvas is nearly uniform',st.stddev))
   TRACE.append({'image':tag,'pixelStddev':list(map(lambda x:round(x,1),st.stddev)),'sha256':hashlib.sha256(raw).hexdigest()})
  except ImportError: pass
 else:
  marker(page).screenshot(path=OUT/(tag+'.png'))

def state(page,role='cleanroom-world'):
 return page.evaluate('(name)=>window.__qa3d.one(name)',role)

def require_state(page,**expected):
 got=state(page)
 require(got is not None,'No rendered cleanroom world observed')
 for k,v in expected.items():require(got.get(k)==v,(k,v,compact(got)))
 return got

def visible_room(page,need_world=True):
 room=marker(page)
 expect(room).to_be_visible(timeout=TIMEOUT)
 room.locator('.cr-visual').scroll_into_view_if_needed()
 if need_world:
  room.locator(WORLD).wait_for(timeout=TIMEOUT)
  try:page.wait_for_function("!!window.__qa3d.one()?.bay",timeout=TIMEOUT)
  except Exception as err:
   detail=page.evaluate("""()=>{const c=document.querySelector('canvas[data-cleanroom-world]');const el=document.querySelector('.cr-room');return {url:location.href,room:el?.dataset.render,phase:el?.dataset.phase,canvas:c?{...c.dataset}:null,viewport:c?.getBoundingClientRect().toJSON(),pageScroll:scrollY,status:el?.innerText.slice(0,380),probe:window.__qa3d?.one()};}""")
   raise AssertionError(('No THREE world presented to the user',detail)) from err
 return room

def make_page(opts=None):
 ctx=browser.new_context(**(opts or {'viewport':{'width':1280,'height':940}}));pg=ctx.new_page()
 pg.set_default_timeout(TIMEOUT)
 faults=[];requests=[]
 pg.on('pageerror',lambda err:faults.append(str(err)))
 pg.on('response',lambda r: requests.append([r.url,r.status]))
 return ctx,pg,faults,requests

def launch(pg,origin,path):
 pg.goto(origin+path,wait_until='domcontentloaded')
 pg.evaluate(PROBE)
 pg.get_by_role('button',name='Play workflow',exact=True).first.click()
 return visible_room(pg)

def prepare_harness(pg,origin,slug='masmanidis-64d-foundry'):
 path=origin+'/__foundry_qa__/render.html'
 pg.route(path,lambda route:route.fulfill(status=200,content_type='text/html',body=HARNESS))
 pg.goto(path,wait_until='domcontentloaded')
 pg.evaluate(PROBE)
 pg.evaluate("""async slug=>{
   const mod=await import('/simulations/foundry/cleanroom-player.js'), data=await import('/simulations/foundry/cleanroom-data.js');
   window.qaPlayer=mod.mountCleanroom(document.querySelector('#qa-rig'));
   window.qaRecords=Array.from({length:18},(_,i)=>({...data.stageForLab(slug,i),trackKey:slug+':'+i}));
   qaPlayer.prepare?.(qaRecords);qaPlayer.setStep(qaRecords[5]);qaPlayer.setProgress(0);
 }""",slug)
 return visible_room(pg)

def step(pg,value,p=0):
 pg.evaluate("""([v,p])=>{
   window.qaPlayer.setStep(typeof v==='number'?window.qaRecords[v]:v);
   window.qaPlayer.setProgress(p);
 }""",[value,p])
 settle(pg)

def progress(pg,v):
 pg.evaluate("p=>window.qaPlayer.setProgress(p)",v)
 settle(pg)

def settle(pg):
 pg.evaluate("""()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))""")

def wait_dataset(pg,expected):
 try:
  pg.wait_for_function("(pairs)=>{const c=document.querySelector('canvas[data-cleanroom-world]');return c&&Object.entries(pairs).every(([k,v])=>c.dataset[k]===v);}",arg=expected,timeout=TIMEOUT)
 except Exception as err:
  actual=pg.evaluate('''()=>{const r=document.querySelector('.cr-room');return {room:r?{...r.dataset}:null,canvas:[...document.querySelectorAll('canvas[data-cleanroom-world]')].map(x=>({...x.dataset,rect:x.getBoundingClientRect().toJSON()})),pressed:[...r.querySelectorAll('[aria-pressed=true]')].map(x=>x.textContent),focus:document.activeElement.outerHTML.slice(0,120),dialog:r.querySelector('dialog')?.open};}''')
  raise AssertionError(('Render state did not arrive',expected,actual,pg.locator('.cr-room').first.inner_text()[:800])) from err
 settle(pg)

def assert_world(s,physical=True):
 require(s and s['w']>80 and s['h']>80 and s['info']['triangles']>10,('Not a usable WebGL frame',compact(s)))
 require(s['models'] and any(x['geometry']>=3 for x in s['models']),('No 3D device geometry',compact(s)))
 if physical:
  a=s['piece']
  require(a and a['rootVisible'] and a['meshCount']>0 and a['localSolid']>0 and min(a['size'])>1e-6,('Workpiece is absent or flat',compact(s)))
  require(a['intersects'],('Workpiece entirely outside camera frustum',compact(s)))
 return s

def assert_register(s,id,landmark):
 require(s['equipment']==id and s['stageModel']=='register' and s['fit']=='native-dry',('Wrong evidence state',id,compact(s)))
 require(any(m['id']==id and m['asset'] and m['geometry']>=6 for m in s['models']),('Missing source GLTF geometry',id,s['models']))
 require(s['native'][landmark] is not None,('Missing native moving part',landmark))

def no_horizontal_overflow(pg):
 got=pg.evaluate("""()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth,...Array.from(document.querySelectorAll('.cr-room')).map(x=>x.scrollWidth-x.clientWidth)]""")
 require(got[0]<=got[1]+1 and all(x<=1 for x in got[2:]),('Horizontal overflow',got))

def assert_no_errors(faults):
 require(not faults,('Uncaught page exceptions',faults))

def geometry(origin):
 ctx,pg,faults,requests=make_page()
 try:
  room=prepare_harness(pg,origin)
  wait_dataset(pg,{'equipment':'02-01','stageModel':'register'})
  first=assert_world(require_state(pg))
  assert_register(first,'02-01','transport')
  require(.135<=first['piece']['size'][0]<=.18 and .135<=first['piece']['size'][2]<=.18,('Wrong round wafer diameter',first['piece']))
  ids=first['scene'],first['piece']['uuid'],first['track']
  anchors=[]
  for p in [0,.08,.16,.215,.26,.55,.69,.88,1]:
   progress(pg,p)
   s=assert_world(require_state(pg))
   require((s['scene'],s['piece']['uuid'],s['track'])==ids,'Scene/wafer/canvas identity reset mid-operation')
   anchors.append(s)
   if p in (0,.215,.55,1):
    visibility=pg.evaluate('()=>__qa3d.occlusion()');TRACE.append({'case':'visibility','machine':'MA6','p':p,**visibility})
    if p in (0,1):require(visibility['ratio']>.50 and visibility['cssWidth']>=18,('Specimen lost during open staging',p,visibility))
    screenshot(pg,'mas-ma6-'+str(round(100*p)))
  require(norm(anchors[0]['piece']['position'],anchors[5]['piece']['position'])>.30,'Wafer fails to load inside MA6')
  require(norm(anchors[3]['native']['transport']['pos'],anchors[5]['native']['transport']['pos'])>.03,'Aligner drawer never travels')
  require(norm(anchors[0]['camPos'],anchors[5]['camPos'])>.08,'Follow camera is stationary')
  terminal=anchors[-1]['piece']['position']
  step(pg,6,0)
  etched=assert_world(require_state(pg))
  require((etched['scene'],etched['piece']['uuid'],etched['track'])==ids,'New wafer, canvas or room created on ordinary handoff')
  require(norm(etched['piece']['position'],terminal)<.01,('Teleport at station boundary',terminal,etched['piece']['position']))
  require(norm(anchors[-1]['camPos'],etched['camPos'])<.035,('Camera jumps between stations',anchors[-1]['camPos'],etched['camPos']))
  progress(pg,.105);transit=state(pg)
  require(norm(transit['piece']['position'],terminal)>.35,'Inter-station carry is not physically visible')
  witness=pg.evaluate('()=>__qa3d.occlusion()');TRACE.append({'case':'visibility','machine':'aisle','p':.105,**witness})
  require(witness['ratio']>.50 and witness['cssWidth']>=18,('Specimen optically buried in the trolley during transfer',witness))
  screenshot(pg,'mas-interstation')
  progress(pg,.68);safety=assert_world(state(pg));require(safety['stageModel']=='teaching-3d','Unregistered RIE should remain a labeled teaching device')
  screenshot(pg,'mas-teaching-etch')
  room.locator('[data-cr-view=inspect]').click()
  pg.wait_for_function("window.__qa3d.one('cleanroom-before')&&window.__qa3d.one('cleanroom-after')")
  before=state(pg,'cleanroom-before');after=state(pg,'cleanroom-after')
  require(before['scene']!=after['scene'] and all(s['piece']['localSolid'] and s['piece']['meshCount'] for s in [before,after]),'Inspection cross-section must be real 3D on both sides')
  for cap in [before,after]:
   edges=cap['piece']['edges']
   require(all(abs(v)<=.99 for v in edges),('Magnified section clipped by viewport',cap['role'],edges))
  screenshot(pg,'mas-before-after-3d')
  room.locator('[data-cr-view=room]').click();settle(pg)
  require_state(pg,mode='room')
  shot_room=state(pg);screenshot(pg,'mas-room-view')
  room.locator('[data-cr-view=follow]').click();settle(pg)
  require(norm(shot_room['camPos'],state(pg)['camPos'])>.12,'Room and follow views are the same camera pose')
  progress(pg,1);end2=state(pg)
  step(pg,7,0)
  wait_dataset(pg,{'equipment':'04-03','stageModel':'register'})
  s=assert_world(state(pg));assert_register(s,'04-03','lid')
  require(ids==(s['scene'],s['piece']['uuid'],s['track']),'Cobra stage re-created the physical wafer')
  require(norm(end2['piece']['position'],s['piece']['position'])<.01,'Handoff teleports between etchers')
  progress(pg,.21);open_lid=state(pg);screenshot(pg,'mas-cobra-load')
  progress(pg,.61);closed=assert_world(state(pg));screenshot(pg,'mas-cobra-run')
  require(norm(open_lid['native']['lid']['rot'],closed['native']['lid']['rot'])>.20,'Cobra lid does not open')
  require(norm(open_lid['native']['carrier']['pos'],closed['native']['carrier']['pos'])>.20,'Cobra carrier fails to seat')
  require(any('/equipment/02-01/' in r and st==200 for r,st in requests) and any('/equipment/04-03/' in r and st==200 for r,st in requests),'Native geometry not fetched from Equipment Register')
  # 150 mm wafer becomes a die after release: keep object identity, update its solid form.
  step(pg,11,.12);old=state(pg);progress(pg,.98);new=state(pg)
  require(old['spec']=='wafer' and new['spec']=='die' and old['piece']['uuid']==new['piece']['uuid'],('Release transition loses provenance',compact(old),compact(new)))
  require(old['piece']['shape']!=new['piece']['shape'],'Wafer to die transition changes only the caption')
  assert_no_errors(faults)
  TRACE.append({'case':'geometry','frames':list(map(compact,[first,etched,transit,safety,closed,before,after]))})
 finally:ctx.close()

def program(origin):
 # A physical control panel must show *this* stage's reader-visible settings,
 # and must change its selected field during SETUP, not masquerade as a vendor HMI.
 ctx,pg,faults,_=make_page()
 try:
  room=prepare_harness(pg,origin)
  wait_dataset(pg,{'equipment':'02-01','stageModel':'register'})
  base=state(pg);room.locator('[data-cr-view=setup]').click()
  wait_dataset(pg,{'mode':'setup'})
  fields=[]
  for p in (.34,.43,.54):
   progress(pg,p)
   a=state(pg)
   require(a['panel'] and a['panel']['visible'] and a['panel']['textured'],'Missing original in-world, textured operator console')
   require(a['panel']['phase']=='SETUP' and a['panel']['screen']['intersects'],('Setup camera misses live screen',compact(a['panel'])))
   field=a['panel']['activeField']
   entered=room.locator('.cr-controls .cr-entered dt').first
   require(entered.count() and entered.inner_text().strip(),('Console setup has no corresponding readable DOM row',p))
   fields.append((field,a['panel']['textureVersion'],entered.inner_text()))
  require(len(set(x[0] for x in fields))>=2 and fields[-1][1]>fields[0][1],('Console image did not respond to programming',fields))
  require(norm(base['camPos'],state(pg)['camPos'])>.25,'Setup camera does not approach the operator panel')
  screenshot(pg,'mas-ma6-operator')
  # Moving a camera must not change the user's selected virtual process phase.
  active=room.get_attribute('data-phase')
  room.locator('[data-cr-view=inspect]').click();wait_dataset(pg,{'mode':'inspect'})
  cam=state(pg,'cleanroom-before')['camPos'];c=room.locator(WORLD).bounding_box()
  x=c['x']+c['width']*.25;y=c['y']+c['height']*.5
  pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x+96,y+35,steps=5);pg.mouse.up();settle(pg)
  after=state(pg,'cleanroom-before')['camPos']
  require(norm(cam,after)>.001 and room.get_attribute('data-phase')==active,'Inspecting or rotating the 3D specimen incorrectly changed the process or failed to rotate')
  # Only authored layers separate: the actual before/after models become taller
  # and return to the original dimensions when recombined, with unchanged custody.
  stack=state(pg,'cleanroom-after')['piece'];split=room.locator('[data-cr-explode]')
  split.click();settle(pg);apart=state(pg,'cleanroom-after')['piece']
  require(split.get_attribute('aria-pressed')=='true' and apart['size'][1]>stack['size'][1]*1.1,('Exploded stack changes only the caption',stack['size'],apart['size']))
  split.click();settle(pg);whole=state(pg,'cleanroom-after')['piece']
  require(norm(stack['size'],whole['size'])<.00005 and apart['uuid']==whole['uuid'],'Restacking alters the physical model or leaves separated layers')
  TRACE.append({'case':'program','fields':fields,'setupClipping':compact(a['panel']['screen']),'inspectionOrbited':True,'explodedThicknessRatio':apart['size'][1]/stack['size'][1]})
  assert_no_errors(faults)
 finally:ctx.close()

def carrier(origin):
 ctx,pg,faults,_=make_page()
 try:
  room=prepare_harness(pg,origin)
  # Use the public stage-builder data contract, the real unmodified 18 process
  # stages, and a documented native field F33. In native() we additionally
  # verify the input is populated by the real application's selected field.
  pg.evaluate('''async()=>{
   const data=await import('/simulations/foundry/cleanroom-data.js'),slug='masmanidis-64d-foundry';
   qaRecords=Array.from({length:18},(_,i)=>({...data.stageForLab(slug,i,{specimenIdentity:{label:'F33',fieldMm:[0,0],fieldSideMm:22,channel:32,face:'top'}}),trackKey:slug+':'+i}));
   qaPlayer.reset();qaPlayer.prepare(qaRecords);
  }''')
  phases=[]
  for i,p,expected in [(7,.7,'absent'),(8,.1,'absent'),(8,.97,'attached'),(9,.66,'attached'),(10,.68,'attached'),(11,.10,'attached'),(11,.98,'separate'),(12,.20,'absent')]:
   step(pg,i,p);s=state(pg)
   require(s['carrierState']==expected and s['artifactId']=='F33',('Wrong support custody or tracked specimen identity',i,p,expected,compact(s)))
   a=s['toolCarrier'];b=s['fieldLocator'];piece=s['piece']
   require(a['visible']==(expected!='absent') and (not a['visible'] or a['geometry']['localSolid']>0),('Support status is text without physical hardware',i,p,a))
   if expected=='attached':
    require(a['attached'] is True and norm(a['position'],piece['position'])<.035,('Support/wafer are geometrically separated while marked attached',i,p,a,piece['position']))
    require(abs(s['workRotation'][2])>.97,('Front-side temporary carrier never flips wafer face down',i,p,s['workRotation']))
   if expected=='separate':require(not a['attached'] and s['spec']=='die',('Released die remains on the 150mm carrier',i,p))
   if s['spec']=='wafer':require(b and b['visible'] and b['artifactId']=='F33' and b['geometry']['meshCount']>=4,'Reticle custody marker missing')
   phases.append({'station':i+1,'p':p,'carrier':expected,'shape':s['spec'],'field':'F33'})
   if (i,p) in [(8,.97),(11,.98)]:screenshot(pg,'mas-carrier-'+str(i+1))
  TRACE.append({'case':'carrier','phases':phases})
  assert_no_errors(faults)
 finally:ctx.close()

def lifecycle(origin):
 # Repeatedly seek between registered tools, then lose the GL context while the
 # live user-facing player is mounted. No duplicate canvas, old scene, or fake
 # success is acceptable. Same scene resets should release transient textures.
 ctx,pg,faults,_=make_page()
 try:
  room=prepare_harness(pg,origin);wait_dataset(pg,{'equipment':'02-01','stageModel':'register'})
  root=state(pg)['piece']['uuid'];counts=[]
  for _ in range(4):
   for i in [5,6,7]:
    step(pg,i,0)
    if i in (5,7):wait_dataset(pg,{'stageModel':'register'})
    progress(pg,.69);s=state(pg);require(s['piece']['uuid']==root,'Repeated navigation re-created persistent wafer')
   pg.evaluate('()=>{qaPlayer.reset();qaPlayer.prepare(qaRecords);qaPlayer.setStep(qaRecords[5]);qaPlayer.setProgress(0);}')
   wait_dataset(pg,{'equipment':'02-01','stageModel':'register'})
   counts.append(state(pg)['info'])
  require(counts[-1]['textures']<=counts[1]['textures']+2 and counts[-1]['geometries']<=counts[1]['geometries']+8,('GPU resources accumulate with every reset',counts))
  require(pg.locator(WORLD).count()==1,'Multiple WebGL contexts after seeking')
  ok=pg.evaluate('''()=>{const c=document.querySelector('canvas[data-cleanroom-world]');const gl=c.getContext('webgl2');const ext=gl?.getExtension('WEBGL_lose_context');if(ext){ext.loseContext();return true;}return false;}''')
  if ok:
   pg.wait_for_function("document.querySelector('.cr-room')?.dataset.render==='schematic'")
   require(not pg.locator(WORLD).count() and room.locator('.cr-controls').is_visible(),'Recoverable WebGL loss hides all accessible programming information')
   retry=room.locator('.cr-retry')
   expect(retry).to_be_visible();retry.click();visible_room(pg);wait_dataset(pg,{'equipment':'02-01','stageModel':'register'})
   require(marker(pg).get_attribute('data-phase')=='transfer' and not retry.is_visible(),'Retry lost the active step or left stale recovery controls')
  pg.evaluate('()=>{qaPlayer.destroy();qaPlayer.destroy();}')
  require(not marker(pg).count() and not pg.locator(WORLD).count(),'Destroy leaves a ghost renderer or duplicate DOM')
  TRACE.append({'case':'lifecycle','repeatedResetInfo':counts,'contextLossExtension':ok})
  assert_no_errors(faults)
 finally:ctx.close()

def entries(origin):
 for slug,rec in LABS.items():
  ctx,pg,faults,req=make_page({'viewport':{'width':390,'height':844},'device_scale_factor':1,'is_mobile':True,'has_touch':True,'reduced_motion':'reduce'})
  try:
   room=launch(pg,origin,rec['url'])
   got=state(pg)
   assert_world(got,physical=got['spec']!='none' and got['fit']!='external')
   require(room.get_attribute('data-render') in ('register','teaching-3d'),('Silent 2D default',slug,room.get_attribute('data-render')))
   no_horizontal_overflow(pg);assert_no_errors(faults)
   TRACE.append({'case':'entry','slug':slug,'model':got['stageModel'],'fit':got['fit'],'triangles':got['info']['triangles'],'resolution':[got['w'],got['h']]})
   print('  entry:',slug,got['stageModel'],flush=True)
  finally:ctx.close()

def native(origin):
 ctx,pg,faults,req=make_page()
 try:
  room=launch(pg,origin,MAS)
  controls=pg.locator('.bts-workflow-player')
  settle(pg);old=state(pg)
  selected=pg.locator('#field').input_value()
  require(selected=='F33' and old['artifactId']==selected and old['fieldLocator']['artifactId']==selected,('Active spatial field mismatches actual native selection',selected,old['artifactId']))
  pg.get_by_role('button',name='Pause workflow',exact=True).click()
  p0=room.get_attribute('data-phase')
  n0=controls.get_attribute('data-workflow-step')
  pg.wait_for_timeout(7800)
  require(room.get_attribute('data-phase')==p0 and controls.get_attribute('data-workflow-step')==n0,'Pause advanced the specimen or stage')
  rel=room.locator('[data-cr-view=room]');rel.click();settle(pg)
  require(room.get_attribute('data-phase')==p0,'Viewing the 3D room changed native process time')
  room.locator('[data-cr-view=follow]').click()
  # Reach the two registered machines through trusted native preview/commit controls.
  start_count=pg.locator('#steps li.done').count()
  require(start_count<5,('Native real startup outran pause',start_count))
  for i in range(start_count+1,8):
   pg.locator('#preview').click();expect(pg.locator('#id')).to_contain_text('candidate')
   pg.locator('#commit').click();expect(pg.locator('#steps li.done')).to_have_count(i)
   room.locator('.cr-visual').scroll_into_view_if_needed()
   wait_dataset(pg,{'bay':str(i)})
   settle(pg)
   if i in (5,7):
    wanted='02-01' if i==5 else '04-03'
    wait_dataset(pg,{'equipment':wanted,'stageModel':'register'})
    s=assert_world(state(pg));assert_register(s,wanted,'transport' if i==5 else 'lid')
    require(s['piece']['uuid']==old['piece']['uuid'],'Native process UI lost its selected workpiece')
  assert_no_errors(faults);TRACE.append({'case':'native','committedStations':7,'user-controls':True})
 finally:ctx.close()

def atlas(origin):
 ctx,pg,faults,req=make_page()
 try:
  pg.goto(origin+ATLAS+'#profile=si-np1&variant=production',wait_until='domcontentloaded')
  pg.evaluate(PROBE)
  panel=pg.locator('#workflow-player');room=marker(pg);room.locator('.cr-visual').scroll_into_view_if_needed()
  # A redraw after observer installation makes already-mounted Atlas scenes observable.
  btn=room.locator('[data-cr-view=room]');btn.click();room.locator('[data-cr-view=follow]').click()
  settle(pg);visible_room(pg)
  a=state(pg);require(a['fit']=='external' and not a['piece']['rootVisible'],'External fabrication presented as executable')
  for _ in range(5):pg.locator('#workflow-next').click()
  pg.locator('[data-wf-station="1"]').click()
  room=marker(pg)
  wait_dataset(pg,{'equipment':'04-02','stageModel':'register'})
  s=state(pg)
  require('100 mm' in room.locator('.cr-route').inner_text() and s['fit']=='native-dry','Wrong independent wafer shown')
  # Compare both speeds against the same *actually presented* interval.
  # Never freeze the page's rAF or make real buttons wait for a virtual UI.
  # Observe the same capped, monotonic display timestamps as the native
  # 3D player. Anchoring to its trusted Play click avoids a slow WebDriver
  # round-trip counting as part of one speed measurement but not the other.
  def measure(speed):
   pg.locator('#workflow-speed').select_option(speed)
   pg.evaluate('''()=>{window.__rateSample=null;
     const go=document.querySelector('#workflow-play'), room=document.querySelector('.cr-room');
     go.addEventListener('click',()=>{
       let last=null,dt=0,frames=0;
       function sample(t){frames++;if(last!==null)dt+=Math.min(100,t-last);last=t;
         if(dt>=980)window.__rateSample={phase:room.dataset.phase,dt,frames};
         else requestAnimationFrame(sample);}
       requestAnimationFrame(sample);
     },{once:true});}''')
   pg.locator('#workflow-play').click()
   pg.wait_for_function('window.__rateSample!==null',timeout=TIMEOUT)
   found=pg.evaluate('window.__rateSample')
   pg.locator('#workflow-play').click()
   return found
  slow=measure('0.5')
  require(slow['phase']=='transfer',('0.5× does not retain early compact transfer',slow))
  pg.locator('[data-wf-station="1"]').click()
  fast=measure('2')
  require(fast['phase'] in ('load','set up'),('2× does not accelerate real station progress',fast))
  TRACE.append({'case':'atlas-real-speed','0.5x':slow,'2x':fast})
  frozen=room.get_attribute('data-phase')
  pg.wait_for_timeout(18000)
  require(panel.get_attribute('data-player-state')=='paused' and room.get_attribute('data-phase')==frozen,'Pause lost in Atlas')
  pg.locator('[data-wf-station="2"]').click();wait_dataset(pg,{'equipment':'04-03','stageModel':'register'})
  require('150 mm' in room.locator('.cr-route').inner_text(),'Cobra witness must be distinguished from 100 mm run')
  # Switching to a no-workflow branch must tear down any previous camera and renderer.
  pg.locator('#variant-select').select_option('dummy')
  require(panel.get_attribute('data-player-plan')=='boundary' and not marker(pg).count(),'Hidden branch continues simulating the prior wafer')
  assert_no_errors(faults)
 finally:ctx.close()

def faults(origin):
 # Missing GLB must stay three-dimensional, clearly as a teaching fixture, not a foundry replica.
 ctx,pg,faults,requests=make_page()
 try:
  pg.route('**/equipment/02-01/*.glb',lambda r:r.abort())
  room=prepare_harness(pg,origin)
  progress(pg,.65);time.sleep(.15);settle(pg)
  s=assert_world(state(pg))
  require(s['stageModel']=='teaching-3d' and not any(m['asset'] for m in s['models']),'Missing GLB falsely reported as a sourced machine')
  require(not room.locator('[data-cr-view=register]').is_visible() and 'unavailable' in room.locator('.cr-caption').inner_text().lower(),'Register button falsely promises a missing model')
  # A 200 mm wafer cannot be inserted into this 150 mm Cobra fixture.
  mismatch={'workpieceShape':'wafer','sizeMm':200,'equipmentId':'04-03','kind':'fabrication','effect':'etch','operation':'Etch on an incompatible fixture','before':'Patterned 200 mm wafer','after':'Expected target only'}
  step(pg,mismatch,.60);hold=assert_world(state(pg));require(hold['fit']=='blocked' and hold['stageModel']!='register','Incompatible specimen seated in an original machine')
  require('no process' in room.locator('.cr-command').inner_text().lower(),'Blocked operation worded as a completed operation')
  ref=room.locator('[data-cr-view=register]');expect(ref).to_be_visible(timeout=TIMEOUT)
  ref.click();wait_dataset(pg,{'mode':'register','fit':'blocked'});ext=state(pg)
  require(not ext['piece']['rootVisible'] and any(m['asset'] and m['id']=='04-03' for m in ext['models']),'Inspect-only register mode seats the invalid specimen or lacks its genuine exterior')
  room.locator('[data-cr-view=follow]').click();wait_dataset(pg,{'mode':'follow','fit':'blocked'})
  # On an independent physical/evidence boundary retain the room but withdraw the unavailable specimen.
  step(pg,{'kind':'unknown','nonphysical':True,'operation':'Outside foundry','before':'External input','after':'Not disclosed','specimen':'External, not loaded'},.69)
  inactive=state(pg)
  require(not inactive['piece']['rootVisible'] and inactive['fit']=='external','External unknown gap is physically simulated')
  assert_no_errors(faults)
 finally:ctx.close()
 ctx,pg,faults,_=make_page()
 try:
  pg.add_init_script("""{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,...a){return /^webgl|experimental-webgl/.test(k)?null:native.call(this,k,...a);}}""")
  pg.goto(origin+MAS,wait_until='domcontentloaded')
  pg.get_by_role('button',name='Play workflow',exact=True).click()
  room=visible_room(pg,need_world=False)
  pg.wait_for_function("document.querySelector('.cr-room')?.innerText.match(/WebGL|3D unavailable|could not start the 3D viewer/i)")
  require(not room.locator(WORLD).count(),'WebGL unavailable but 3D claimed')
  require(room.locator('.cr-controls').is_visible(),'Fallback prevents inspecting the real station controls')
  pg.get_by_role('button',name='Pause workflow',exact=True).click()
  assert_no_errors(faults)
 finally:ctx.close()

def mobile(origin):
 ctx,pg,faults,req=make_page({'viewport':{'width':390,'height':844},'device_scale_factor':2,'is_mobile':True,'has_touch':True,'reduced_motion':'reduce','color_scheme':'dark'})
 try:
  room=prepare_harness(pg,origin)
  wait_dataset(pg,{'equipment':'02-01','stageModel':'register'})
  progress(pg,.60);s=assert_world(state(pg))
  no_horizontal_overflow(pg)
  require(s['panel'] and s['panel']['phase']=='MODEL RUN',('Reduced-motion 3D stage contradicts highlighted run phase',s['panel'],room.get_attribute('data-phase')))
  holdpose=s['camPos'];progress(pg,.74);s=state(pg)
  require(norm(holdpose,s['camPos'])<.002,('Continuous camera movement inside reduced-motion run phase',holdpose,s['camPos']))
  require(s['w']<=pd_width(pg)*1.55,'Excessive GPU resolution for mobile canvas')
  for kind in ('room','setup','inspect','follow'):
   b=room.locator('[data-cr-view='+kind+']')
   require(b.is_visible() and b.is_enabled(),('Missing mobile view',kind))
   b.tap()
   wait_dataset(pg,{'mode':kind})
   no_horizontal_overflow(pg)
  b=room.locator('[data-cr-enlarge]');before_box=room.locator(WORLD).bounding_box();before_id=state(pg)['piece']['uuid']
  b.tap();expect(room.locator('dialog')).to_be_visible();settle(pg);after_box=room.locator(WORLD).bounding_box()
  require(after_box['height']>before_box['height']*1.15 and state(pg)['piece']['uuid']==before_id,('Enlargement loses specimen or barely changes viewport',before_box,after_box))
  require(b.get_attribute('aria-expanded')=='true' and pd_width(pg)<=391,'Bad enlarged mobile camera width/semantics')
  b.tap();settle(pg);require(not room.locator('dialog').is_visible() and state(pg)['piece']['uuid']==before_id,'Closing enlarged viewport lost workpiece')
  screenshot(pg,'mas-mobile-follow')
  room.locator('[data-cr-view=inspect]').tap()
  wait_dataset(pg,{'mode':'inspect'})
  screenshot(pg,'mas-mobile-inspection')
  # Focus can reach the camera controls and make a choice without a pointer.
  b=room.locator('[data-cr-view=room]');b.focus();pg.keyboard.press('Enter')
  wait_dataset(pg,{'mode':'room'})
  require(pg.evaluate("document.activeElement?.matches('[data-cr-view=room]')"),'Keyboard focus lost')
  assert_no_errors(faults)
 finally:ctx.close()

def reticle_phone(origin):
 # Does selecting a physical net change the artwork itself on a phone,
 # independently of the channel number printed over it?
 ctx,pg,faults,_=make_page({'viewport':{'width':390,'height':844},'device_scale_factor':2,'is_mobile':True,'has_touch':True,'reduced_motion':'reduce'})
 try:
  room=prepare_harness(pg,origin)
  def pick(ch):
   pg.evaluate('''async ch=>{
    const m=await import('/simulations/foundry/cleanroom-data.js');
    const r=m.stageForLab('masmanidis-64d-foundry',13,{specimenIdentity:{label:'F33',fieldMm:[0,0],fieldSideMm:22,channel:ch,face:'top'}});
    qaPlayer.setStep({...r,trackKey:'masmanidis-64d-foundry:13'});qaPlayer.setProgress(.98);
   }''',ch)
   btn=room.locator('[data-cr-view=reticle]');expect(btn).to_be_visible(timeout=TIMEOUT)
   btn.tap();wait_dataset(pg,{'mode':'reticle'});pg.wait_for_function("window.__qa3d.one('cleanroom-reticle')?.piece?.localSolid>0")
   source=state(pg,'cleanroom-reticle');require(source['net']['visible'] and source['net']['drawRange']['count']>0,'No selected source circuit rendered')
   require(source['piece']['intersects'] and max(map(abs,source['piece']['edges']))<=.995,('Field artwork cropped on phone',source['piece']['edges']))
   msg=room.locator('.cr-reticle-key');label=msg.inner_text()
   require('CH '+str(ch) in label and '0-based' in label and msg.evaluate('e=>e.scrollWidth<=e.clientWidth+1&&parseFloat(getComputedStyle(e).fontSize)>=11'),('Source mapping unreadable on phone',label))
   return (source,room.locator(WORLD).screenshot(),label)
  first,a,la=pick(32);second,b,lb=pick(64)
  require(first['net']['id']==second['net']['id'] and first['net']['drawRange']!=second['net']['drawRange'],'Text changed but graphic highlights the same conductor')
  from PIL import Image,ImageChops
  ia=Image.open(io.BytesIO(a)).convert('RGB');ib=Image.open(io.BytesIO(b)).convert('RGB')
  require(ia.size==ib.size,'Artwork changed viewport on selection')
  w,h=ia.size;l=(0,int(h*.17),w,int(h*.84));diff=ImageChops.difference(ia.crop(l),ib.crop(l));n=sum(max(v)>=12 for v in (diff.get_flattened_data() if hasattr(diff,'get_flattened_data') else diff.getdata()))
  require(n>=12,('Selection changes too few rendered pixels to find on mobile',n,ia.size))
  if OUT:(OUT/'f33-ch32-phone.png').write_bytes(a);(OUT/'f33-ch64-phone.png').write_bytes(b)
  TRACE.append({'case':'phone-reticle','labels':[la,lb],'deltaPhysicalPixels':n,'nativeRenderedDimensions':[w,h],'artworkEdges':first['piece']['edges'],'ranges':[first['net']['drawRange'],second['net']['drawRange']]})
  # Two microscope presets must visibly focus genuinely different die coordinates.
  rects=[];baseline=second['camPos']
  for tag,selector in [('site','[data-cr-site-focus]'),('bond','[data-cr-bond-focus]')]:
   btn=room.locator(selector);btn.tap();wait_dataset(pg,{'reticleFocus':tag})
   f=state(pg,'cleanroom-reticle')
   require(f['net']['id']==second['net']['id'] and norm(baseline,f['camPos'])>.001,('Preset failed to zoom source coordinates',tag))
   c=room.locator(WORLD);raw=c.screenshot()
   if OUT:(OUT/('f33-ch64-phone-'+tag+'.png')).write_bytes(raw)
   dims=f['sitePx'] if tag=='site' else f['bondPx']
   require(dims and max(dims)>=10,('Selected feature is below 10 CSS pixels in its own microscope view',tag,dims))
   TRACE.append({'case':'focused-artwork','focus':tag,'projectedCSSPixels':dims})
   rects.append((tag,f['camPos']))
   btn.tap();wait_dataset(pg,{'reticleFocus':'whole'})
  require(norm(rects[0][1],rects[1][1])>.0002,('Site and die-pad presets inspect the same coordinate',rects))
  no_horizontal_overflow(pg);assert_no_errors(faults)
 finally:ctx.close()

def manual_stamp(pg,button):
 # Verify WebDriver sent a real pointer click to the intended native control.
 # Native rAF refreshes and toolbar reflow cannot silently turn this into an
 # uncontrolled poll for a piece of caption text.
 target=pg.locator('#'+button);expect(target).to_be_enabled(timeout=TIMEOUT)
 pos=pg.evaluate('()=>window.__trustedAudit.length')
 target.scroll_into_view_if_needed();target.click()
 try:pg.wait_for_function('([n,id])=>window.__trustedAudit.slice(n).some(e=>e[0]===id&&e[1])',arg=[pos,button],timeout=3500)
 except Exception as error:
  why=pg.evaluate('''([n,id])=>{const el=document.getElementById(id),r=el.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {before:n,last:window.__trustedAudit.slice(-12),rev:mas64().rev,candidate:mas64ProcessWitness().candidate,at:at?.outerHTML.slice(0,200),target:el.outerHTML.slice(0,150),rect:r.toJSON(),pageState:document.querySelector('.bts-workflow-player').dataset.playerState,scrollY};}''',[pos,button])
  if OUT:pg.screenshot(path=OUT/('native-untrusted-'+button+'.png'))
  raise AssertionError(('Browser pointer never activated intended native control',button,why)) from error
 return pg.evaluate('window.mas64ProcessWitness()')

def native_hold(origin):
 ctx,pg,faults,_=make_page()
 try:
  pg.goto(origin+MAS,wait_until='domcontentloaded');pg.evaluate(PROBE)
  pg.evaluate('''()=>{window.__trustedAudit=[];document.addEventListener('click',e=>{if(e.target instanceof Element)window.__trustedAudit.push([e.target.closest('button')?.id||e.target.tagName,e.isTrusted,performance.now()]);},true);}''')
  ch=pg.locator('#channel');expect(ch).to_be_enabled(timeout=TIMEOUT)
  ch.select_option('32')
  pg.get_by_role('button',name='Play workflow',exact=True).click()
  room=visible_room(pg)
  pg.get_by_role('button',name='Pause workflow',exact=True).click()
  initial=state(pg);root_uid=initial['piece']['uuid']
  # Traverse native controls, not engine setters. Rewind then branches from an
  # actual available revision rather than constructing a synthetic failed state.
  expect(pg.locator('.bts-workflow-player')).to_have_attribute('data-player-state','paused')
  initial_count=pg.locator('#steps li.done').count()
  for i in range(initial_count+1,14):
   evidence=manual_stamp(pg,'preview')
   if not evidence['candidate']:
    msg=pg.evaluate("()=>({revision:window.mas64().rev,work:document.querySelector('.bts-workflow-player').dataset.playerState,stage:document.querySelector('#station').textContent,status:document.querySelector('#status').textContent,events:window.__trustedAudit.slice(-9)})")
    raise AssertionError(('Trusted native click never produced a candidate',i,evidence,msg))
   manual_stamp(pg,'commit');expect(pg.locator('#steps li.done')).to_have_count(i)
   # Follow the actual operator path: inspect the newly presented bay, then
   # approach the next native control after the station's programming and
   # evidence content has settled. WebKit may move the buttons on this
   # legitimate reflow, so do not race a second click against the first.
   room.locator('.cr-visual').scroll_into_view_if_needed()
   wait_dataset(pg,{'bay':str(i)})
   settle(pg)
  pg.locator('#face').select_option('top')
  room.locator('.cr-visual').scroll_into_view_if_needed()
  wait_dataset(pg,{'artifactId':'F33','amplifierZero':'63'})
  top=state(pg)
  # A keyboard change emits a browser-trusted event; select_option()
  # synthesizes input/change and the native wrapper intentionally ignores it.
  pg.locator('#face').focus();pg.locator('#face').press('End')
  expect(pg.locator('#face')).to_have_value('bottom')
  room.locator('.cr-visual').scroll_into_view_if_needed();wait_dataset(pg,{'artifactId':'F33','amplifierZero':'0'})
  bottom=state(pg)
  require(ch.input_value()=='32' and top['piece']['uuid']==bottom['piece']['uuid']==root_uid,'Changing connector face renumbered the physical probe/field or recreated its model')
  # Magnifying the sourced device layout is a camera operation, not a process commit.
  detail=room.locator('[data-cr-view=reticle]')
  if detail.is_visible():
   detail.click();wait_dataset(pg,{'mode':'reticle'});screenshot(pg,'native-f33-ch32-bottom')
   room.locator('[data-cr-view=follow]').click()
  pg.locator('#rewind').select_option('11');pg.locator('#back').click()
  expect(pg.locator('#steps li.done')).to_have_count(11)
  ctrl=pg.locator('#p-release');expect(ctrl).to_be_visible()
  ctrl.focus();ctrl.press('Home')
  require(float(ctrl.input_value())<1,'Unable to request deliberately incomplete release')
  pg.locator('#preview').click()
  expect(pg.locator('#id')).to_contain_text('candidate');room.locator('.cr-visual').scroll_into_view_if_needed()
  pg.wait_for_function('window.mas64ProcessWitness().release.qualified===false')
  witness=pg.evaluate('window.mas64ProcessWitness()')
  wait_dataset(pg,{'fit':'native-hold','specimen':'wafer','artifactId':'F33','carrier':'attached'})
  require('held' in room.locator('.cr-result').inner_text().lower(),('Unqualified native release presented as a die',room.locator('.cr-result').inner_text()))
  require(pg.locator('#steps li.done').count()==11 and not pg.locator('#export').is_enabled(),'Read-only animation altered committed state or export readiness')
  # The outgoing preview is at p=1. Restart this native step: while it plays
  # through the release display interval the failed witness remains held.
  pg.get_by_role('button',name='Play workflow',exact=True).click()
  pg.wait_for_function("document.querySelector('.cr-room')?.dataset.phase==='run'",timeout=20000)
  pg.wait_for_function("document.querySelector('.cr-room')?.dataset.phase==='unload'",timeout=15000)
  wait_dataset(pg,{'fit':'native-hold','specimen':'wafer','artifactId':'F33','carrier':'attached'})
  pg.get_by_role('button',name='Pause workflow',exact=True).click()
  assert_no_errors(faults)
  TRACE.append({'case':'native-hold','physicalField':'F33','physicalChannel':32,'topZero':63,'bottomZero':0,'committedBeforeRelease':11,'heldWitness':witness})
 finally:ctx.close()

def receivers(origin):
 # Exercise *every* authored native receiver, rather than inferring fit from
 # the 198 viewable cabinet exteriors. Two named detached witnesses are not
 # internal stations and must never be promoted to valid process receivers.
 ctx,pg,faults,req=make_page()
 try:
  room=prepare_harness(pg,origin)
  known=pg.evaluate('''async()=>{const {CLEANROOM_MODELS}=await import('/simulations/foundry/cleanroom-models.js');return Object.values(CLEANROOM_MODELS).filter(m=>m.wafer?.poses?.length).map(m=>({id:m.id,kind:m.handling,mm:m.wafer.nominalMm,shape:m.wafer.shape,asset:m.assetUrl}));}''')
  require(len(known)>=12 and any(m['kind']=='detached-witness' for m in known),'Native receiver truth table unavailable')
  for m in known:
   shape='wafer' if m['shape']=='round' else 'panel'
   ref={'trackKey':'receiver/'+m['id'],'equipmentId':m['id'],'specimen':'Dry, independent register teaching witness','workpieceShape':shape,'sizeMm':m['mm'],'effect':'measure','kind':'inspection','operation':'Verify the original dry loading fixture','before':'Dry test workpiece','after':'Same dry test workpiece','settings':[['Mode','Geometry check only']]}
   step(pg,ref,0)
   if m['kind']=='detached-witness':
    s=assert_world(state(pg))
    require(s['stageModel']!='register' and s['fit']!='native-dry',('Detached witness promoted to validated chamber',m,s['stageModel']))
    seen='detached, no native insertion'
   else:
    wait_dataset(pg,{'equipment':m['id'],'stageModel':'register'})
    s=assert_world(state(pg));require(any(a['asset']==m['asset'] for a in s['models']),('Nominal dry witness used wrong model',m,s['models']))
    progress(pg,.58);loaded=state(pg)
    require(loaded['fit']=='native-dry' and norm(s['piece']['position'],loaded['piece']['position'])>.10,('Witness does not enter original receiver',m))
    seen='native geometry and movement'
   print('  receiver:',m['id'],seen,flush=True);TRACE.append({'case':'receiver','equipment':m['id'],'nominalMm':m['mm'],'result':seen})
  assert_no_errors(faults)
 finally:ctx.close()

def stage_matrix(origin):
 # Every authored device-lab stage, including divergent polymer, graphene
 # and OECT branches. This is display coverage, not foundry qualification.
 ctx,pg,errors,_=make_page()
 try:
  prepare_harness(pg,origin)
  plans=pg.evaluate('''async()=>{
   const b='/simulations/foundry/cleanroom-';
   const [si,flex,per,ret,data]=await Promise.all(['silicon','flex','peripheral','retinal','data'].map(n=>import(b+n+'.js')));
   const raw={...si.default,...flex.default,...per.default,'retinal-photovoltaic-foundry':ret.default,'stentrode-foundry':Array(8).fill({})};
   window.stageMatrix=[];
   for(const [slug,rows] of Object.entries(raw)){
     const variants=[...new Set(rows.flatMap(x=>Object.keys(x?.branches||{})))];if(!variants.length)variants.push('base');
     for(const branch of variants){
       const records=rows.map((x,i)=>({...data.stageForLab(slug,i,branch==='base'?{}:{branch}),trackKey:slug+':'+branch+':'+i}));
       stageMatrix.push({slug,branch,records});
     }
   }
   return stageMatrix.map(r=>({slug:r.slug,branch:r.branch,length:r.records.length}));
  }''')
  total=0;counts={};samples=[]
  for pi,plan in enumerate(plans):
   pg.evaluate('''i=>{qaPlayer.reset();qaPlayer.prepare(stageMatrix[i].records);}''',pi)
   for i in range(plan['length']):
    pg.evaluate('''([pi,i])=>{qaPlayer.setStep(stageMatrix[pi].records[i]);qaPlayer.setProgress(.62);}''',[pi,i]);settle(pg)
    world=state(pg)
    require(world and world['bay']==str(i),('Missing authored 3D stage',plan,i,compact(world)))
    q=world['fit'];physical=world['spec']!='none' and q!='external'
    assert_world(world,physical=physical)
    if not physical:require(not world['piece']['rootVisible'],('Digital record/external process assigned a physical specimen',plan,i))
    require(math.isfinite(sum(world['camPos'])),('Nonfinite scientific camera',plan,i))
    counts[q]=counts.get(q,0)+1;total+=1
    if world['stageModel']=='register' and len(samples)<40:samples.append([plan['slug'],plan['branch'],i,world['equipment']])
   print(f"  {plan['slug']} / {plan['branch']}: {plan['length']} stations",flush=True)
  require(total>=200,('Incomplete route/branch sweep',total))
  TRACE.append({'case':'stage-matrix','testedStages':total,'branches':plans,'fitCounts':counts,'sampleOriginalReceivers':samples})
  assert_no_errors(errors)
 finally:ctx.close()

def native_journey(origin,slug,count):
 # Deliberately real time: no fast-forward, private process-state mutation,
 # model fakes, fake time or accelerated rendering. Let the lab reach its own
 # synthetic-output archive; only click Export after the native capture finished.
 ctx,pg,errors,_=make_page({'viewport':{'width':1024,'height':800},'reduced_motion':'no-preference','accept_downloads':True})
 try:
  start=time.monotonic()
  room=launch(pg,origin,'/simulations/'+slug+'/')
  stages={};identity=set();first=None;last_log=-1
  while time.monotonic()-start<count*55:
   z=pg.evaluate('''()=>{const el=document.querySelector('.bts-workflow-player'),r=document.querySelector('.cr-room'),c=r?.querySelector('canvas[data-cleanroom-world]');return {play:el?.dataset.playerState,step:el?.dataset.workflowStep,p:r?.dataset.phase,render:r?.dataset.render,canvas:c?{...c.dataset}:null,ids:window.__qa3d.identity(),status:el?.querySelector('[data-flow-role=status]')?.innerText};}''')
   require(z['play'] not in ('blocked','paused'),('Autoplay unexpectedly stopped',slug,z))
   require(z['canvas'] and z['render'] in ('register','teaching-3d'),('3D presentation lost mid-workflow',slug,z))
   c=z['canvas'];k=int(c['bay']);item=stages.setdefault(k,{'phases':set(),'models':set(),'features':set(),'fits':set(),'specimens':set(),'equipment':c.get('equipment'),'kind':c.get('stageKind')})
   item['phases'].add(z['p']);item['models'].add(c.get('stageModel'));item['features'].add(c.get('feature',''));item['fits'].add(c.get('fit'));item['specimens'].add(c.get('specimen'))
   identity.add((c['trackId'],*z['ids']))
   if k!=last_log:print(f"  {slug} bay {k+1}/{count}: {c.get('equipment') or item['kind']}",flush=True);last_log=k
   if z['play']=='done':break
   pg.wait_for_timeout(240)
  # The external WebDriver sampling loop can miss phases while servicing a
  # heavy frame. Merge the transition log recorded at the actual renderer
  # callback, including the first frame before the harness scrolled to it.
  frame_history=pg.evaluate('()=>__qa3d.history()')
  for f in frame_history:
   if str(f.get('bay','')).isdigit() and int(f['bay']) in stages:
    stages[int(f['bay'])]['phases'].add(f['phase'])
  require(z['play']=='done' and int(z['step'])==count,('Real-time native playback did not deliver its synthetic output',slug,z))
  require(sorted(stages)==list(range(count)),('Missing native 3D bay(s)',slug,sorted(stages)))
  require(len(identity)==1,('Clock or native actions recreated room/canvas/specimen during uninterrupted autoplay',identity))
  missing=[{'bay':k,'phase':sorted({'load','set up','run','unload'}-item['phases'])} for k,item in stages.items() if not {'load','set up','run','unload'}<=item['phases']]
  # Export is tested even if low-frame-rate presentation misses an early phase.
  TRACE.append({'case':'phaseEvidence','slug':slug,'missing':missing,'renderTransitions':frame_history})
  if slug=='masmanidis-64d-foundry':
   for k,tool in [(5,'02-01'),(7,'04-03')]:require(stages[k]['equipment']==tool and 'register' in stages[k]['models'],('Missing sourced model during actual autoplay',k,stages[k]))
  else:
   require(any(s['equipment']=='04-03' and 'blocked' in s['fits'] for s in stages.values()),'200 mm Neuropixels product falsely seated at Cobra fixture')
  out=pg.locator('#export');require(out.is_enabled(),'Native run has no enabled export')
  with pg.expect_download() as d:out.click()
  download=d.value
  with zipfile.ZipFile(download.path()) as zip:
   require(len(zip.namelist())>=4 and zip.testzip() is None,('Missing, empty, or corrupt synthetic output archive',download.suggested_filename))
   files=zip.namelist()
  tidy=[{'bay':k,**{i:(sorted(v) if isinstance(v,set) else v) for i,v in s.items()}} for k,s in sorted(stages.items())]
  TRACE.append({'case':'journey','slug':slug,'realSeconds':round(time.monotonic()-start,1),'sameSpatialSceneAndWorkpiece':True,'stages':tidy,'archive':download.suggested_filename,'files':files})
  assert_no_errors(errors)
  require(not missing,('Full physical station clock did not present',slug,missing))
 finally:ctx.close()

def journey_mas(origin):native_journey(origin,'masmanidis-64d-foundry',18)
def journey_np(origin):native_journey(origin,'neuropixels-foundry',20)

def pd_width(pg):
 return pg.locator(WORLD).first.evaluate('n=>n.getBoundingClientRect().width')

def main():
 global OUT,browser
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--origin',help='Test a served origin, otherwise serve public/ locally.')
 parser.add_argument('--serve',type=Path,default=ROOT/'public')
 parser.add_argument('--artifacts',type=Path,help='Optional path for JSON evidence and screenshots; prefer /tmp.')
 parser.add_argument('--engine',choices=('chromium','webkit','firefox'),default='chromium')
 parser.add_argument('--browser-exe',default=os.getenv('CHROME_BIN'))
 parser.add_argument('--cases',nargs='+',choices=ALL+EXTENDED,default=ALL)
 parser.add_argument('--keep-going',action='store_true')
 a=parser.parse_args();OUT=a.artifacts
 if OUT:OUT.mkdir(parents=True,exist_ok=True)
 with contextlib.ExitStack() as stack:
  if a.origin:origin=a.origin.rstrip('/')
  else:
   class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
   server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(a.serve)))
   threading.Thread(target=server.serve_forever,daemon=True).start()
   stack.callback(server.server_close);stack.callback(server.shutdown)
   origin=f'http://127.0.0.1:{server.server_port}'
  pw=stack.enter_context(sync_playwright());br=getattr(pw,a.engine);kwargs={'headless':True}
  if a.engine=='chromium':
   kwargs['args']=['--no-sandbox','--no-proxy-server','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
   executable=a.browser_exe
   if not executable:
    local=ROOT.parent/'production-equipment-qa/runtime/chrome-bin/chrome'
    executable=str(local) if local.is_file() else None
   if executable:kwargs['executable_path']=executable
  elif a.browser_exe:kwargs['executable_path']=a.browser_exe
  browser=br.launch(**kwargs);stack.callback(browser.close)
  for case in a.cases:
   print(f'CHECK {case} ({a.engine})',flush=True);begin=time.monotonic()
   try:
    globals()[case](origin)
    OUTCOMES.append(dict(case=case,status='pass',seconds=round(time.monotonic()-begin,2)))
    print(f'PASS {case}',flush=True)
   except Exception as e:
    OUTCOMES.append(dict(case=case,status='fail',error=repr(e),seconds=round(time.monotonic()-begin,2)))
    print(f'FAIL {case}: {e}',file=sys.stderr,flush=True)
    traceback.print_exc()
    if not a.keep_going:break
   finally:
    if OUT:(OUT/'results.json').write_text(json.dumps({'engine':a.engine,'results':OUTCOMES,'evidence':TRACE},indent=2))
 print(json.dumps({'engine':a.engine,'results':OUTCOMES},indent=2));return int(any(x['status']!='pass' for x in OUTCOMES))
if __name__=='__main__':sys.exit(main())
