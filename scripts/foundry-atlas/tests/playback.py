#!/usr/bin/env python3
"""Checks the production HTML player using Playwright's controlled browser clock."""
import argparse,functools,http.server,json,os,shutil,threading
from pathlib import Path
from urllib.parse import parse_qs
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser();p.add_argument('html',type=Path);p.add_argument('--screens',type=Path);a=p.parse_args();html=a.html.resolve()
class Serve(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*unused):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Serve,directory=html.parent));threading.Thread(target=srv.serve_forever,daemon=True).start()
home=f'http://127.0.0.1:{srv.server_port}/{html.name}'
def outline(page):
 assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
def visit(page,query):
 page.goto(home+query,wait_until='domcontentloaded')
 q=parse_qs(query[1:]);route=q['profile'][0];variant=q.get('variant',[''])[0]
 page.wait_for_function('(want)=>{const d=document.querySelector("#workflow-player")?.dataset;return d?.playerProfile===want[0]&&d?.playerVariant===want[1]}',arg=[route,variant])
def state(page):return page.locator('#workflow-player').get_attribute('data-player-state')
def index(page):return page.locator('#workflow-player').get_attribute('data-player-index')
def scene(page):return page.locator('#workflow-player').get_attribute('data-player-scene')
def assert_clean(errors,requests):
 assert not errors,errors
 assert not [x for x in requests if not x.startswith(home) and x!=home.rsplit('/',1)[0]+'/simulations/foundry/cleanroom-player.js'],requests
passed=[]
try:
 with sync_playwright() as pw:
  kw={'headless':True,'args':['--no-sandbox','--disable-gpu','--no-proxy-server','--disable-dev-shm-usage']}
  paths=[os.getenv('CHROME_BIN'),os.getenv('CHROMIUM_PATH'),str(Path(__file__).resolve().parents[4]/'production-equipment-qa/runtime/chrome-bin/chrome'),shutil.which('chromium'),shutil.which('google-chrome')]
  exe=next((x for x in paths if x and Path(x).is_file()),None)
  if exe:kw['executable_path']=exe
  browser=pw.chromium.launch(**kw)
  for label,profile in [
   ('Desktop',dict(viewport={'width':1440,'height':1020})),
   ('iPhone13',pw.devices['iPhone 13']),
   ('Small dark / reduced motion',dict(viewport={'width':360,'height':740},has_touch=True,is_mobile=True,color_scheme='dark',reduced_motion='reduce')),
  ]:
   page=browser.new_page(**profile);page.set_default_timeout(6500);page.clock.install()
   errs,req=[],[]
   page.on('pageerror',lambda e:errs.append(str(e)));page.on('request',lambda r:req.append(r.url))
   # Deliberately exercise the original static/offline player.
   page.route('**/simulations/foundry/cleanroom-player.js',lambda route:route.abort())
   def button(selector):
    x=page.locator(selector)
    if profile.get('has_touch'):x.tap()
    else:x.click()
   visit(page,'#profile=flex-ptnr')
   assert page.locator('#workflow-player').get_attribute('data-player-plan')=='branch'
   assert '1,024 sites at 1 mm pitch' in page.locator('#workflow-branch-preview').inner_text()
   assert not page.locator('#workflow-next').count()
   button('#workflow-play')
   assert page.locator('#variant-select').input_value()=='square' and 'variant=square' in page.url
   assert state(page)=='playing' and index(page)=='1' and scene(page)=='prepare'
   part=page.locator('.workflow-plate [data-part=shuttle]')
   x=part.get_attribute('transform');page.clock.run_for(700);y=part.get_attribute('transform')
   if profile.get('reduced_motion')=='reduce':assert x==y,x
   else:assert x!=y,(x,y)
   if a.screens:
    a.screens.mkdir(parents=True,exist_ok=True);page.locator('#workflow-player').screenshot(path=str(a.screens/(label.split()[0]+'-playing.png')))
   button('#workflow-play')
   assert state(page)=='paused' and page.locator('#workflow-play').inner_text()=='Resume'
   y=part.get_attribute('transform');page.clock.run_for(4300);assert part.get_attribute('transform')==y and index(page)=='1'
   button('#workflow-next');assert state(page)=='paused' and index(page)=='2'
   button('#workflow-prev');assert index(page)=='1'
   page.locator('#workflow-speed').select_option('2');button('#workflow-play');page.clock.run_for(2200)
   assert index(page)=='2' and state(page)=='playing'
   button('#workflow-read');assert state(page)=='paused' and page.locator('details[data-step="1"][open]').count()==1
   assert not page.locator('[data-step="1"]').evaluate("e=>e.closest('.not-applicable')")
   button('#workflow-replay');assert index(page)=='1' and state(page)=='playing'
   page.clock.run_for(14500)
   assert state(page)=='finished' and index(page)=='7'
   assert 'Sequence complete' in page.locator('#workflow-live').inner_text()
   button('#workflow-play');assert state(page)=='playing' and index(page)=='1'
   page.locator('#variant-select').select_option('panel')
   assert page.locator('#workflow-player').get_attribute('data-player-plan')=='boundary'
   assert not page.locator('#workflow-play').count()
   page.clock.run_for(7400);assert not page.locator('#workflow-step').count()
   visit(page,'#profile=flex-neurogrid&variant=active')
   assert page.locator('#workflow-player').get_attribute('data-player-plan')=='sequence'
   assert index(page)=='6' and 'Handoff 1 of 1' in page.locator('#workflow-position').text_content()
   assert 'Reference' in page.locator('#workflow-evidence').inner_text()
   button('#workflow-play');page.clock.run_for(3850)
   assert state(page)=='finished' and index(page)=='6'
   visit(page,'#profile=si-np1&variant=production')
   assert scene(page)=='boundary' and page.locator('#workflow-evidence').inner_text()=='External or unverified'
   assert 'does not supply' in page.locator('#workflow-context').inner_text()
   page.locator('#variant-select').select_option('dummy')
   assert page.locator('#workflow-player').get_attribute('data-player-plan')=='boundary' and not page.locator('#workflow-play').count()
   visit(page,'#profile=tolstosheeva-connector-coupons&variant=b')
   assert index(page)=='1';button('#workflow-play');page.clock.run_for(3850);assert index(page)=='3'
   page.locator('#variant-select').select_option('c')
   assert index(page)=='2' and state(page)=='ready';page.clock.run_for(8000);assert index(page)=='2' and state(page)=='ready'
   button('#workflow-next');assert index(page)=='3';button('#workflow-next');assert index(page)=='4' and page.locator('#workflow-next').is_disabled()
   page.locator('#variant-select').select_option('b')
   button('#workflow-next');assert index(page)=='3';button('#workflow-next');assert index(page)=='4' and page.locator('#workflow-next').is_disabled()
   page.locator('#variant-select').select_option('tri')
   assert index(page)=='5' and page.locator('#workflow-next').is_disabled()
   visit(page,'#profile=living-constructs');assert page.locator('#workflow-player').get_attribute('data-player-plan')=='boundary' and not page.locator('#workflow-play').count()
   outline(page);assert_clean(errs,req)
   passed.append({'mode':label,'status':'PASS','tests':['registered branch selection','keyframe advances (or static under reduced motion)','pause holds pose','manual next/previous','resume and speed','focus original handoff','finished and replay','incompatible branch does not play','skip inapplicable early handoffs','external and out-of-scope boundary','Tolstosheeva B/C/reference indices and mid-play cancellation','no overflow, script errors or network requests']})
   page.close()
  page=browser.new_page();page.goto(html.as_uri()+'#profile=flex-neurogrid&variant=active',wait_until='domcontentloaded')
  assert page.locator('#workflow-play').is_enabled()
  browser.close()
finally:srv.shutdown()
print(json.dumps({'result':'PASS','cases':passed,'standalone':'PASS'},indent=2))
