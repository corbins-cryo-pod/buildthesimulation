"""Run at repo root; optional MTG2_CHROME and MTG2_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request,shlex
base=os.getenv('MTG2_BASE','http://127.0.0.1:44930');url=base+'/simulations/equipment/06-12/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('MTG2_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44930'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/mtg2-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',*shlex.split(os.getenv('MTG2_CHROME_ARGS',''))])
  if os.getenv('MTG2_CHROME'):opt['executable_path']=os.environ['MTG2_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#mt-model[data-ready=true]',timeout=14000)
  q.locator('[data-view=detail]').click()
  q.locator('#run').click()
  status=q.locator('#status').inner_text();assert 'Peak 2.4 mN' in status and '0.04000 mN/µm' in status
  assert 'spring 60 µm and beam 15 µm' in q.locator('#preview-state').inner_text()
  with q.expect_download() as d:q.locator('#json').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['fixture']['revision']=='1' and len(j['result']['rows'])==21
  with q.expect_download() as d:q.locator('#csv').click()
  assert Path(d.value.path()).read_text().startswith('sample_id,revision,travel_um,')
  q.locator('#travel').evaluate("(el)=>{el.value=19;el.dispatchEvent(new Event('input',{bubbles:true}))}")
  q.locator('#run').click();assert 'Peak 0 mN' in q.locator('#status').inner_text() and 'unavailable' in q.locator('#status').inner_text()
  q.locator('#spring').select_option('0.08')
  q.locator('#travel').evaluate("(el)=>{el.value=160;el.dispatchEvent(new Event('input',{bubbles:true}))}")
  q.locator('#run').click();assert 'ceiling exceeded' in q.locator('#status').inner_text() and q.locator('#json').is_disabled()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, force/contact/boundary/overload, CSV and JSON, mobile')
finally:
 if proc:proc.terminate();proc.wait()
