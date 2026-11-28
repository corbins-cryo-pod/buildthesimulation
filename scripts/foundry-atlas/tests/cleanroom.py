#!/usr/bin/env python3
"""Real-renderer Atlas QA: serve local production assets and a generated Atlas HTML."""
import argparse, functools, http.server, json, os, shutil, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser()
p.add_argument('html',type=Path)
p.add_argument('--public-root',type=Path,default=Path('public'))
p.add_argument('--screens',type=Path)
p.add_argument('--expect-native',action='store_true',help='Require 3D GLTF playback, not the cutaway fallback')
args=p.parse_args()
atlas=args.html.resolve()
prefix='/simulations/foundry/atlas/index.html'
class Serve(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*unused):pass
 def translate_path(self,path):
  return str(atlas) if path.split('?',1)[0]==prefix else super().translate_path(path)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Serve,directory=str(args.public_root.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
home=origin+prefix
passed=[]
def browser_opts():
 kw={'headless':True,'args':['--no-sandbox','--no-proxy-server','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 paths=[os.getenv('CHROME_BIN'),os.getenv('CHROMIUM_PATH'),str(Path(__file__).resolve().parents[4]/'production-equipment-qa/runtime/chrome-bin/chrome'),shutil.which('chromium'),shutil.which('google-chrome')]
 exe=next((x for x in paths if x and Path(x).is_file()),None)
 if exe:kw['executable_path']=exe
 return kw

try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(**browser_opts())
  for label,config in [('Desktop',dict(viewport={'width':1440,'height':1050})),('iPhone13',pw.devices['iPhone 13']),('Small-dark-reduced',dict(viewport={'width':360,'height':760},is_mobile=True,has_touch=True,reduced_motion='reduce',color_scheme='dark'))]:
   page=browser.new_page(**config);page.set_default_timeout(12000);page.clock.install()
   container=page.locator('#workflow-player');room=container.locator('.cr-room')
   errors,urls=[] , []
   page.on('pageerror',lambda e:errors.append(str(e))); page.on('request',lambda r: urls.append(r.url))
   def click(selector):
    b=page.locator(selector)
    b.tap() if config.get('has_touch') else b.click()
   def visit(query,expected='equipment'):
    page.goto(home+query,wait_until='domcontentloaded')
    if expected=='equipment':page.locator('#workflow-player[data-player-render=equipment]').wait_for()
    elif expected=='boundary':page.locator('#workflow-player[data-player-plan=boundary]').wait_for()
    else:page.locator('#workflow-player[data-player-plan=branch]').wait_for()
   def val(name):return container.get_attribute('data-player-'+name)
   def phase():return room.get_attribute('data-phase')
   def same_screen():
    assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth+1')
    assert container.evaluate('e=>e.scrollWidth<=e.clientWidth+1')
   visit('#profile=si-np1&variant=production')
   assert val('index')=='1' and val('station-kind')=='unknown'
   assert val('equipment')=='' and '200 mm' in room.locator('.cr-route').inner_text()
   for _ in range(5):click('#workflow-next')
   assert val('index')=='6' and val('station')=='1' and phase()=='unload'
   click('[data-wf-station="1"]')
   assert val('equipment')=='04-02' and '100 mm' in room.locator('.cr-route').inner_text()
   assert 'Independent witness' in room.locator('.cr-route').inner_text()
   assert room.locator('.cr-controls').get_by_text('Modeled holder',exact=True).count()==1
   assert page.locator('.workflow-station-link a').get_attribute('href').endswith('/04-02/simulator/')
   if args.expect_native and label=='Desktop':
    room.locator('.cr-visual canvas').wait_for(timeout=25000)
    assert room.get_attribute('data-render')=='register'
   native=room.get_attribute('data-render')
   if args.screens and label=='Desktop':
    args.screens.mkdir(parents=True,exist_ok=True)
    room.screenshot(path=str(args.screens/'NP1-100mm-witness.png'))
   click('#workflow-play')
   page.clock.run_for(2490)
   assert phase()=='set up',phase()
   click('#workflow-play');page.clock.run_for(9000)
   assert phase()=='set up' and val('equipment')=='04-02' and val('state')=='paused'
   click('#workflow-play');page.clock.run_for(4700)
   assert val('equipment')=='04-03' and val('index')=='6'
   assert '150 mm' in room.locator('.cr-route').inner_text()
   assert 'not the 100 mm etch witness' in room.locator('.cr-controls').inner_text()
   click('#workflow-next');assert val('index')=='7' and val('equipment')=='08-02'
   assert 'Separate supplied die' in room.locator('.cr-route').inner_text()
   same_screen()
   page.locator('#variant-select').select_option('dummy')
   assert val('plan')=='boundary' and not room.count() and not page.locator('#workflow-play').count()

   visit('#profile=flex-ptnr','branch')
   click('#workflow-play');page.locator('#workflow-player[data-player-render=equipment]').wait_for()
   assert val('variant')=='square' and val('index')=='1'
   assert val('station-kind')=='unknown' and '180 mm' in room.locator('.cr-route').inner_text()
   click('#workflow-next')
   assert val('index')=='2' and val('equipment')=='02-03'
   assert '10 mm square local witness' in room.locator('.cr-controls').inner_text()
   assert 'same lead intent: pass 1' in room.locator('.cr-route').inner_text()
   click('[data-wf-station="3"]')
   assert val('index')=='2' and val('equipment')=='02-03'
   assert 'same lead intent: pass 2' in room.locator('.cr-route').inner_text()
   if args.screens and label=='Desktop':
    if args.expect_native:room.locator('.cr-visual canvas').wait_for(timeout=25000)
    room.screenshot(path=str(args.screens/'PtNRGrid-pass-2.png'))
   for _ in range(3):click('#workflow-next')
   assert val('index')=='5'
   click('[data-wf-station="1"]');assert 'Release' in room.locator('.cr-route').inner_text()
   click('[data-wf-station="2"]');assert 'Porous Pt-rich' in room.locator('.cr-result').inner_text()
   same_screen()
   if args.screens and label=='iPhone13':
    args.screens.mkdir(parents=True,exist_ok=True)
    room.screenshot(path=str(args.screens/'PtNRGrid-phone.png'))

   visit('#profile=tolstosheeva-connector-coupons&variant=b')
   assert val('index')=='1' and val('equipment')=='02-12'
   click('#workflow-play')
   page.locator('#variant-select').select_option('c')
   page.locator('#workflow-player[data-player-render=equipment]').wait_for()
   page.clock.run_for(15000)
   assert val('state')=='ready' and val('index')=='2'
   click('[data-wf-station="1"]')
   assert val('equipment')=='04-01' and 'Oxide exposed locally' in room.locator('.cr-result').inner_text()
   click('#workflow-next');assert val('index')=='3' and val('equipment')=='08-04'
   available=room.locator('.cr-model-toggle')
   assert available.is_visible()
   if label=='Desktop' and args.expect_native:
    click('.cr-model-toggle');room.locator('.cr-visual canvas').wait_for(timeout=25000)
    assert 'inspection only' in room.locator('.cr-caption').inner_text()
    click('.cr-model-toggle');assert not room.locator('.cr-visual canvas').count()
   page.locator('#variant-select').select_option('tri')
   page.locator('#workflow-player[data-player-render=equipment]').wait_for()
   assert val('index')=='5' and val('equipment')=='05-07' and page.locator('#workflow-next').is_disabled()
   same_screen()
   assert not errors,errors
   assert all(u.startswith(origin) for u in urls),urls
   passed.append({'mode':label,'status':'PASS','nativeObserved':native,'checks':['selected branch order and teardown','actual register links','separate 100/150 mm holders','moving between named stations','operator setup phase','pause holds playhead','manual station previews','supported station model versus inspection only','material-state outputs','no viewport overflow or cross-origin requests']})
   page.close()
  page=browser.new_page();urls=[];page.on('request',lambda r:urls.append(r.url))
  page.goto(atlas.as_uri()+'#profile=flex-neurogrid&variant=active',wait_until='domcontentloaded')
  assert page.locator('#workflow-player').get_attribute('data-player-render')=='schematic'
  assert 'Offline view:' in page.locator('#workflow-limits').inner_text()
  assert page.locator('#workflow-play').is_enabled() and len(urls)==1,urls
  browser.close()
finally:server.shutdown()
print(json.dumps({'status':'PASS','cases':passed,'standalone':'PASS'},indent=2))
