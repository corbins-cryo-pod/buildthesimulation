"""Offline Chromium smoke tests; HTTP responses supplied from the built public tree.
This does not claim native Astro integration, WebGL, Safari or physical-device coverage.
"""
from pathlib import Path
import json, os, shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
PUB=ROOT/'public'; OUT=ROOT/'docs/neural-growth'; OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,truth,details=None):
 checks.append({'name':name,'passed':bool(truth),'details':details});print(('PASS ' if truth else 'FAIL ')+name,flush=True)
 if not truth:raise AssertionError(name)
def setup(browser,slug,mobile=False):
 ctx=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},device_scale_factor=1,is_mobile=mobile,has_touch=mobile)
 page=ctx.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(e.stack))
 def route(r):
  f=PUB/urlparse(r.request.url).path.lstrip('/')
  if f.is_file():r.fulfill(status=200,body=f.read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
  else:r.abort()
 page.route('**/*',route)
 path=f'/labs/{slug}/index.html'
 html=(PUB/path.lstrip('/')).read_text().replace('<head>',f'<head><base href="https://lab.test{path}">')
 page.set_content(html,wait_until='domcontentloaded');return ctx,page,errors
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
  ctx,pg,errs=setup(b,'neuron-growth-v3')
  pg.wait_for_function('window.neuronApp && neuronApp.stats',timeout=20000)
  pg.evaluate("neuronApp.send({type:'run',on:false})")
  check('V3 starts with a live worker',pg.evaluate('!!window.Worker'))
  for scenario in ['sphere','worm','first','stages']:
   pg.evaluate('(key)=>neuronApp.load(key)',scenario);pg.wait_for_timeout(600)
   pg.evaluate("neuronApp.send({type:'run',on:false})");pg.wait_for_timeout(120)
   check('V3 preset '+scenario,pg.evaluate('Number.isFinite(neuronApp.stats.t)'))
  target=pg.evaluate('neuronApp.stats.t+2880')
  pg.evaluate("neuronApp.send({type:'ff',minutes:2880})")
  pg.wait_for_function('(target)=>neuronApp.stats.t>=target',arg=target,timeout=30000)
  check('V3 completes two-day fast forward',True)
  pg.screenshot(path=str(OUT/'v3-desktop.png'))
  check('V3 desktop has no horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  check('V3 desktop no script exceptions',not errs,errs);ctx.close()
  ctx,pg,errs=setup(b,'neuron-growth-v3',True)
  pg.wait_for_function('window.neuronApp && neuronApp.stats');pg.wait_for_timeout(400)
  check('V3 mobile 390px viewport',pg.evaluate('innerWidth===390'))
  check('V3 mobile no horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  check('V3 mobile no script exceptions',not errs,errs)
  pg.screenshot(path=str(OUT/'v3-mobile.png'),full_page=True);ctx.close()
  ctx,pg,errs=setup(b,'neurotissue-v4')
  pg.wait_for_function('window.neurotissueApp && neurotissueApp.summary.frames>0',timeout=20000)
  check('V4 starts with corrected recording','v4.1' in pg.evaluate('neurotissueApp.summary.revision'))
  check('V4 Canvas fallback active in this environment',pg.evaluate("neurotissueApp.summary.renderer==='canvas-projection'"))
  check('V4 fallback disables unavailable field glow',pg.locator('#fgain').is_disabled())
  manifest=json.loads((PUB/'labs/neurotissue-v4/library-manifest.json').read_text())
  for item in manifest:
   pg.locator(f'.run[data-id="{item["id"]}"]').click()
   pg.wait_for_function("document.getElementById('veil').hidden && neurotissueApp.summary.frames>0",timeout=30000)
   check('V4 loads '+item['id'],pg.evaluate('neurotissueApp.summary.frames')==item['frames'])
   if item['id']=='conduit-10mm':
    check('V4 10mm mismatch visible','mismatch' in pg.locator('#bench').inner_text().lower())
   if item['id']=='conduit-8mm':
    rows=pg.evaluate('neurotissueApp.summary.rawRows')
    reversals=sum(bool(a['conduit']['bridged']) and not z['conduit']['bridged'] for a,z in zip(rows,rows[1:]))
    check('V4 retains 13 raw bridge reversals',reversals==13,reversals)
    check('V4 archived provenance visible','ARCHIVED' in pg.locator('#provenanceBanner').inner_text())
  pg.locator('.run[data-id="corrected-hippocampal-7days"]').click();pg.wait_for_timeout(300)
  pg.locator('#tSlider').fill('0');pg.locator('#tSlider').dispatch_event('input')
  before=pg.evaluate('neurotissueApp.summary.time');pg.locator('#tPlay').click();pg.wait_for_timeout(900);pg.locator('#tPlay').click()
  check('V4 playback advances time',pg.evaluate('neurotissueApp.summary.time')>before)
  pg.locator('#tSlider').fill('12');pg.locator('#tSlider').dispatch_event('input');pg.wait_for_timeout(150)
  check('V4 scrubs to recorded frame',pg.evaluate('neurotissueApp.summary.time')==2160)
  with pg.expect_download() as d:pg.locator('#exportMeasurements').click()
  payload=json.loads(Path(d.value.path()).read_text())
  check('V4 export separates raw rows and history','rawRows' in payload and 'history' in payload and all('history' not in r for r in payload['rawRows']))
  check('V4 export includes revision','v4.1' in payload['modelRevision'])
  pg.locator('#cams button').nth(1).click();pg.wait_for_timeout(500)
  check('V4 camera preset responds',not errs,errs)
  pg.screenshot(path=str(OUT/'v4-desktop.png'))
  pg.locator('#modeLive').click();pg.locator('#liveScn').select_option('gel')
  pg.locator('#lo-seed').fill('1.5');pg.locator('#liveStart').click()
  check('V4 rejects fractional seed','integer' in pg.locator('#liveNote').inner_text())
  pg.locator('#lo-seed').fill('3');pg.locator('#liveStart').click()
  pg.wait_for_function("neurotissueApp.summary.mode==='live' && neurotissueApp.summary.time>10",timeout=20000)
  check('V4 live corrected worker advances','v4.1' in pg.evaluate('neurotissueApp.summary.revision'))
  pg.locator('#tPlay').click();pg.wait_for_timeout(250);t=pg.evaluate('neurotissueApp.summary.time');pg.wait_for_timeout(300)
  check('V4 live pause stops simulation',pg.evaluate('neurotissueApp.summary.time')==t)
  pg.locator('#modeLib').click();pg.wait_for_function("document.getElementById('veil').hidden && neurotissueApp.summary.mode==='library'")
  check('V4 returns from live to recorded mode',True)
  check('V4 desktop no horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  check('V4 desktop no script exceptions',not errs,errs);ctx.close()
  ctx,pg,errs=setup(b,'neurotissue-v4',True)
  pg.wait_for_function('window.neurotissueApp && neurotissueApp.summary.frames>0',timeout=20000)
  check('V4 mobile no horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  check('V4 mobile no script exceptions',not errs,errs)
  pg.screenshot(path=str(OUT/'v4-mobile.png'),full_page=True);ctx.close();b.close()
finally:
 (OUT/'browser-verification.json').write_text(json.dumps({'environment':'Headless Chromium; offline route fulfillment; Canvas fallback; no WebGL','checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks)},indent=2))
