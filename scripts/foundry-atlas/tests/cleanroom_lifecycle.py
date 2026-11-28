#!/usr/bin/env python3
"""Atlas loading, branch-prewarm and custody-reset contract without GPU assumptions."""
import argparse, functools, http.server, json, os, shutil, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser()
p.add_argument('html',type=Path)
args=p.parse_args()
html=args.html.resolve()
script=b"""
export function mountCleanroom(container, options) {
 const log=window.__atlasAudit??=[];
 const id=log.filter(x=>x.event==='mount').length+1;
 const emit=(event,extra={})=>log.push({event,id,...extra});
 emit('mount',{context:options?.context});
 const room=document.createElement('div');room.className='cr-room';room.dataset.render=id===1?'loading-3d':'teaching-3d';
 room.innerHTML='<div class="cr-grid"><section class="cr-machine"><div class="cr-visual"><canvas data-cleanroom-world></canvas></div></section><section class="cr-controls">Operator setup</section></div>';
 container.append(room);
 if(id===1)setTimeout(()=>{room.dataset.render='teaching-3d';},2200);
 return {
  prepare(stations){
   emit('prepare',{equipment:stations.map(s=>s.equipmentId||null),keys:stations.map(s=>s.trackKey)});
   // A preload rejection must not prevent the current stage from playing.
   return Promise.reject(new Error('optional prewarm failed'));
  },
  reset(){emit('reset');},
  setStep(s){emit('step',{equipment:s.equipmentId||null});},
  setProgress(progress){room.dataset.progress=String(progress);},
  destroy(){emit('destroy');room.remove();}
 };
}
"""
gate=threading.Event()
modpath='/simulations/foundry/cleanroom-player.js'
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*unused):pass
 def do_GET(self):
  if self.path==modpath:
   gate.wait(timeout=15)
   self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(script)
   return
  super().do_GET()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=html.parent))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/{html.name}'
try:
 with sync_playwright() as pw:
  kw={'headless':True,'args':['--no-sandbox','--no-proxy-server','--disable-gpu','--disable-dev-shm-usage']}
  paths=[os.getenv('CHROME_BIN'),os.getenv('CHROMIUM_PATH'),str(Path(__file__).resolve().parents[4]/'production-equipment-qa/runtime/chrome-bin/chrome'),shutil.which('chromium'),shutil.which('google-chrome')]
  exe=next((x for x in paths if x and Path(x).is_file()),None)
  if exe:kw['executable_path']=exe
  browser=pw.chromium.launch(**kw)
  tab=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
  tab.set_default_timeout(10000);tab.clock.install();errors=[]
  tab.on('pageerror',lambda e:errors.append(str(e)))
  tab.goto(url+'#profile=tolstosheeva-connector-coupons&variant=b',wait_until='domcontentloaded')
  player=tab.locator('#workflow-player')
  def val(name):return player.get_attribute('data-player-'+name)
  def audit():return tab.evaluate('window.__atlasAudit')
  assert val('render')=='loading' and val('index')=='1'
  assert not player.locator('.workflow-plate svg').count()
  assert player.locator('.workflow-loading').is_visible()
  tab.locator('#workflow-play').tap()
  assert val('state')=='playing'
  tab.clock.run_for(9000)
  assert val('index')=='1' and val('render')=='loading'
  gate.set()
  player.locator('.cr-visual canvas').wait_for()
  assert val('render')=='equipment' and val('state')=='playing' and val('index')=='1'
  assert val('view')=='loading-3d'
  tab.clock.run_for(1000)
  assert player.locator('.cr-room').get_attribute('data-progress')=='0'
  tab.clock.run_for(1500)
  assert val('view')=='teaching-3d'
  assert '3D foundry walkthrough' in player.locator('#workflow-heading').inner_text()
  assert not player.locator('.workflow-plate svg').count() and not player.locator('.workflow-loading').is_visible()
  assert player.locator('.cr-visual').bounding_box()['y'] < player.locator('.cr-controls').bounding_box()['y']
  assert [a['event'] for a in audit()]==['mount','reset','prepare','step'],audit()
  assert audit()[0]['context']=='atlas'
  assert audit()[2]['equipment']==['02-12','08-04',None,'05-07']
  assert len(set(audit()[2]['keys']))==len(audit()[2]['keys'])
  assert all(':b:' in key for key in audit()[2]['keys'])
  tab.clock.run_for(1000);tab.locator('#workflow-play').tap()
  stopped=player.locator('.cr-room').get_attribute('data-progress')
  tab.clock.run_for(500);assert val('state')=='paused'
  assert stopped==player.locator('.cr-room').get_attribute('data-progress')
  tab.locator('#workflow-play').tap();tab.clock.run_for(500)
  assert val('state')=='playing' and stopped!=player.locator('.cr-room').get_attribute('data-progress')
  assert [a['event'] for a in audit()].count('step')==1
  tab.locator('#variant-select').select_option('c')
  tab.locator('#workflow-player[data-player-variant=c][data-player-render=equipment]').wait_for()
  tab.clock.run_for(8000)
  assert val('index')=='2' and val('state')=='ready'
  assert [a['event'] for a in audit()]==['mount','reset','prepare','step','reset','destroy','mount','reset','prepare','step'],audit()
  assert audit()[8]['equipment']==['02-01','04-01','05-02','08-04',None,'05-07']
  tab.locator('[data-wf-station="1"]').tap()
  assert val('equipment')=='04-01' and val('state')=='paused'
  assert [a['event'] for a in audit()[-3:]]==['reset','prepare','step']
  tab.locator('#workflow-replay').tap()
  assert val('state')=='playing' and val('equipment')=='02-01'
  assert [a['event'] for a in audit()[-3:]]==['reset','prepare','step']
  tab.locator('#variant-select').select_option('tri')
  tab.locator('#workflow-player[data-player-variant=tri][data-player-render=equipment]').wait_for()
  assert val('equipment')=='05-07' and val('index')=='5' and val('state')=='ready'
  assert next(a for a in audit() if a['id']==3 and a['event']=='prepare')['equipment']==['05-07']
  assert not errors,errors
  browser.close()
finally:
 gate.set()
 server.shutdown()
print(json.dumps({'status':'PASS','checks':['no schematic flash while module loads','playhead waits for both module and 3D readiness','viewport first on a phone','preload only selected branch (including sub-stations and evidence)','prewarm failure does not block playback','pause/resume preserve custody','branch switch resets and destroys old renderer','manual seek and replay reset custody']},indent=2))
