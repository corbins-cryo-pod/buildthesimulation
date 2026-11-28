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
   page=browser.new_page(**config);page.set_default_timeout(22000)
   container=page.locator('#workflow-player');room=container.locator('.cr-room')
   errors,urls=[] , []
   page.on('pageerror',lambda e:errors.append(str(e))); page.on('request',lambda r: urls.append(r.url))
   def click(selector):
    # Software WebGL stresses requestAnimationFrame under Playwright's clock.
    # A real coordinate click/tap avoids a second artificial stability frame.
    b=page.locator(selector);assert b.is_enabled(),selector
    b.evaluate("e=>e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})")
    box=b.bounding_box();assert box,selector
    x,y=box['x']+box['width']/2,box['y']+box['height']/2
    if config.get('has_touch'):page.touchscreen.tap(x,y)
    else:page.mouse.click(x,y)
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
    assert not container.locator('.workflow-plate svg').count()
    assert room.locator('.cr-visual').bounding_box()['y'] < room.locator('.cr-controls').bounding_box()['y']
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
    container.locator('.cr-room[data-render=register] .cr-visual canvas').wait_for(timeout=25000)
   if room.locator('[data-cr-view=follow]').count():
    container.locator('.cr-room[data-render=register] canvas, .cr-room[data-render=teaching-3d] canvas, .cr-room[data-render=schematic] svg').first.wait_for(timeout=25000)
   native=room.get_attribute('data-render')
   persistent=room.locator('canvas[data-cleanroom-world]')
   canvas=persistent.element_handle() if persistent.count() else None
   if native in ('register','teaching-3d'):
    assert not room.locator('.cr-visual > svg').is_visible()
   if args.screens and label=='Desktop':
    args.screens.mkdir(parents=True,exist_ok=True)
    room.screenshot(path=str(args.screens/'NP1-100mm-witness.png'))
   page.locator('#workflow-speed').select_option('2')
   click('#workflow-play')
   container.locator('.cr-room[data-phase="set up"]').wait_for()
   click('#workflow-play')
   stopped=phase();page.wait_for_timeout(250)
   assert phase()==stopped and val('equipment')=='04-02' and val('state')=='paused'
   click('#workflow-play')
   page.locator('#workflow-player[data-player-equipment="04-03"]').wait_for()
   assert val('index')=='6'
   if canvas:assert persistent.evaluate('(current,original)=>current===original',canvas)
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
    if args.expect_native:container.locator('.cr-room[data-render=register] .cr-visual canvas').wait_for(timeout=25000)
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
   page.wait_for_timeout(350)
   assert val('state')=='ready' and val('index')=='2'
   click('[data-wf-station="1"]')
   assert val('equipment')=='04-01' and 'Oxide exposed locally' in room.locator('.cr-result').inner_text()
   click('#workflow-next');assert val('index')=='3' and val('equipment')=='08-04'
   inspect=room.locator('[data-cr-view=inspect]')
   if inspect.count():
    assert inspect.is_visible()
    if label=='Desktop' and args.expect_native:
     room.locator('.cr-visual canvas[data-cleanroom-world]').wait_for(timeout=25000)
     assert room.get_attribute('data-render') in ('register','teaching-3d')
     click('[data-cr-view=room]')
     assert room.get_attribute('data-view')=='room'
     assert room.locator('.cr-visual canvas[data-cleanroom-world]').is_visible()
     click('[data-cr-view=inspect]')
     assert room.get_attribute('data-view')=='inspect'
     assert room.locator('.cr-visual canvas[data-cleanroom-world]').is_visible()
     click('[data-cr-view=follow]');assert room.get_attribute('data-view')=='follow'
   else:
    assert room.locator('.cr-model-toggle').is_visible()
    if label=='Desktop' and args.expect_native:
     click('.cr-model-toggle');room.locator('.cr-visual canvas').wait_for(timeout=25000)
     assert 'inspection only' in room.locator('.cr-caption').inner_text()
     click('.cr-model-toggle');assert not room.locator('.cr-visual canvas').count()
   page.locator('#variant-select').select_option('tri')
   page.locator('#workflow-player[data-player-render=equipment]').wait_for()
   assert val('index')=='5' and val('equipment')=='05-07' and page.locator('#workflow-next').is_disabled()
   same_screen()
   assert not errors,errors
   assert all(u.startswith((origin+'/', 'blob:'+origin+'/', 'data:')) for u in urls),urls
   passed.append({'mode':label,'status':'PASS','nativeObserved':native,'checks':['selected branch order and teardown','actual register links','separate 100/150 mm holders','same 3D canvas across named stations','operator setup phase','pause holds playhead','manual station previews','supported station model versus inspection only','scene before programming','material-state outputs','no viewport overflow or cross-origin requests']})
   page.close()
  page=browser.new_page()
  page.add_init_script(script="const context=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(api,...rest){return String(api).startsWith('webgl')?null:context.call(this,api,...rest);};")
  page.goto(home+'#profile=flex-neurogrid&variant=active',wait_until='domcontentloaded')
  page.locator('#workflow-player[data-player-render=equipment] .cr-room[data-render=schematic] .cr-visual > svg').wait_for()
  assert not page.locator('.cr-visual canvas').count() and page.locator('#workflow-play').is_enabled()
  page.close()
  page=browser.new_page();urls=[];page.on('request',lambda r:urls.append(r.url))
  page.goto(atlas.as_uri()+'#profile=flex-neurogrid&variant=active',wait_until='domcontentloaded')
  assert page.locator('#workflow-player').get_attribute('data-player-render')=='schematic'
  assert 'Offline view:' in page.locator('#workflow-limits').inner_text()
  assert page.locator('#workflow-play').is_enabled() and len(urls)==1,urls
  browser.close()
finally:server.shutdown()
print(json.dumps({'status':'PASS','cases':passed,'standalone':'PASS','WebGL-unavailable fallback':'PASS'},indent=2))
