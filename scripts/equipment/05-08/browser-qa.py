"""Playwright Chromium, run from repository root.
DSA_CHROME overrides Chromium; DSA_BASE is optional hosted origin.
DSA_SHOTS=1 records review views; DSA_STATIC=1 serves dist."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from zipfile import ZipFile
import subprocess, os, time, urllib.request, json, math
base=os.getenv('DSA_BASE','http://127.0.0.1:4320'); url=base+'/simulations/equipment/05-08/simulator/'
proc=None
try:
 if '127.0.0.1' in base:
  cmd=(['python','-m','http.server','4320','--bind','127.0.0.1','--directory','dist'] if os.getenv('DSA_STATIC') else ['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4320'])
  proc=subprocess.Popen(cmd,env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/dsa-05-08-dev.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url, timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.45)
 with sync_playwright() as p:
  opts=dict(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  if os.getenv('DSA_CHROME'):opts['executable_path']=os.environ['DSA_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY']}
  browser=p.chromium.launch(**opts);ctx=browser.new_context(viewport={'width':1450,'height':950},ignore_https_errors=True,accept_downloads=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  res=page.goto(url,wait_until='domcontentloaded',timeout=55000);assert res.status==200
  page.wait_for_selector('#model[data-ready=true]',timeout=45000)
  page.locator('#deposit').click();page.locator('#capture').click();page.locator('#fit').click()
  defs=lambda key:float(page.locator('[data-meter='+key+']').inner_text().split()[0])
  assert abs(defs('left')-90)<.35 and abs(defs('right')-90)<.35
  with page.expect_download() as d:page.locator('#archive').click()
  with ZipFile(d.value.path()) as z:
   assert not z.testzip() and z.namelist()==['fit.json','sensor.png'];f=json.loads(z.read('fit.json'));assert z.read('sensor.png')[:8]==b'\x89PNG\r\n\x1a\n'
  assert f['sampleId']=='WET-COUPON-01' and f['provenance']['image']['origin']=='simulated'
  with page.expect_download() as d:page.locator('#json').click()
  assert json.loads(Path(d.value.path()).read_text())==f
  with page.expect_download() as d:page.locator('#png').click()
  assert Path(d.value.path()).read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
  page.locator('[name=thetaDeg]').fill('107');page.locator('[name=imageRollDeg]').fill('8')
  page.locator('#capture').click();page.locator('#fit').click();assert abs(defs('left')-107)<.5
  page.locator('#light').click();page.locator('#capture').click();assert 'backlight' in page.locator('#message').inner_text()
  page.locator('#light').click();page.locator('[name=focusMm]').fill('12');page.locator('#capture').click();assert 'focus' in page.locator('#message').inner_text()
  page.locator('#example').click()
  if os.getenv('DSA_SHOTS'):
   for view in ('bench','optical','rear'):
    page.locator('button[data-view='+view+']').click();page.wait_for_timeout(180);page.locator('#model').screenshot(path='public/equipment/05-08/'+view+'.png')
  page.locator('#file').set_input_files('public/equipment/05-08/example-silhouette.png')
  page.wait_for_function("document.getElementById('image-meta').textContent.includes('user-supplied')")
  page.locator('#baselineY').fill('210.5');page.locator('#baselineAngle').fill('0');page.locator('#apply-baseline').click();page.locator('#fit').click();assert abs(defs('left')-90)<.35
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  page.locator('#example').click();assert abs(defs('right')-90)<.35
  print('PASS metric GLB, 90°+ rolled 107° fits, illumination/focus interlocks, local image import, actual JSON+PNG+ZIP export and 390px mobile;',f['angles'],errors)
  assert not errors
finally:
 if proc: proc.terminate();proc.wait()
